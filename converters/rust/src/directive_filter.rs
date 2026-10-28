//! Directive filter framework for GraphQL SDL generation.
//!
//! Provides configuration-driven filtering of GraphQL directives
//! during SDL output, supporting modes like "viewer-friendly"
//! (strip all infrastructure directives) and "exclude-draft"
//! (omit draft/unstable directives).

use crate::types::DirectiveFilterMode;

/// Tier classification for a directive.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DirectiveTier {
    /// Core GraphQL spec directives (e.g., @deprecated, @skip, @include)
    Spec,
    /// Federation directives (@key, @shareable, @external, etc.)
    Federation,
    /// Production-ready custom directives (@constraint, @cache, etc.)
    Custom,
    /// Draft / unstable directives being tested
    Draft,
}

/// Classification of a directive by name.
///
/// This is the canonical list used by the filter to determine
/// which directives to include or exclude based on the active mode.
pub fn classify_directive(name: &str) -> DirectiveTier {
    // Strip leading @ if present
    let name = name.trim_start_matches('@');

    match name {
        // GraphQL spec built-ins
        "deprecated" | "skip" | "include" | "specifiedBy" => DirectiveTier::Spec,

        // Federation v2.x directives
        "key" | "shareable" | "external" | "requires" | "provides" | "override"
        | "inaccessible" | "tag" | "interfaceObject" | "authenticated" | "requiresScopes"
        | "policy" | "cost" | "listSize" | "link" | "composeDirective" => DirectiveTier::Federation,

        // Production custom directives
        "constraint" | "cache" | "authorize" | "mask" | "rateLimit" => DirectiveTier::Custom,

        // Unknown / user directives are treated as Custom (include by default)
        _ => DirectiveTier::Custom,
    }
}

/// Determine whether a directive should be included in the output
/// based on the active filter mode.
pub fn should_include_directive(name: &str, mode: &DirectiveFilterMode) -> bool {
    match mode {
        DirectiveFilterMode::All => true,

        DirectiveFilterMode::ViewerFriendly => {
            // Only include spec-level directives in viewer-facing output
            classify_directive(name) == DirectiveTier::Spec
        }

        DirectiveFilterMode::ExcludeDraft => {
            // Include everything except draft directives
            classify_directive(name) != DirectiveTier::Draft
        }

        DirectiveFilterMode::Custom(ref excluded) => {
            let name = name.trim_start_matches('@');
            !excluded
                .iter()
                .any(|d| d.trim_start_matches('@').eq_ignore_ascii_case(name))
        }
    }
}

/// Filter a list of directive strings, keeping only those allowed
/// by the active mode.
pub fn filter_directive_list(directives: &[String], mode: &DirectiveFilterMode) -> Vec<String> {
    directives
        .iter()
        .filter(|d| {
            // Extract directive name from SDL text like "@key(fields: \"id\")"
            let name = d
                .trim_start_matches('@')
                .split(|c: char| c == '(' || c.is_whitespace())
                .next()
                .unwrap_or(d);
            should_include_directive(name, mode)
        })
        .cloned()
        .collect()
}

/// Scanner state for string-aware directive filtering.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ScannerState {
    Normal,
    SingleQuotedString,
    DoubleQuotedString,
    BlockString,
}

/// Remove trailing whitespace (except newlines) from the end of a string.
fn trim_current_line_end(value: &mut String) {
    let trailing = value
        .bytes()
        .rev()
        .take_while(|&b| b.is_ascii_whitespace() && b != b'\n')
        .count();
    value.truncate(value.len() - trailing);
}

/// Decide whether the buffered directive is included, flush it to `result`,
/// and reset the buffer and paren depth.
fn finish_directive(
    result: &mut String,
    directive_buffer: &mut String,
    paren_depth: &mut i32,
    mode: &DirectiveFilterMode,
) {
    let name = directive_buffer
        .trim_start_matches('@')
        .split(|c: char| c == '(' || c.is_whitespace())
        .next()
        .unwrap_or(directive_buffer);
    if should_include_directive(name, mode) {
        result.push_str(directive_buffer);
    }
    directive_buffer.clear();
    *paren_depth = 0;
}

/// String-aware directive filter core.
///
/// Scans the whole input in a single pass, carrying scanner state across
/// lines so that block strings survive. `@` tokens inside single-quoted
/// strings, double-quoted strings, and `"""` block strings are literal
/// text, not directives; parentheses inside string arguments do not affect
/// directive boundaries.
fn filter_directives(input: &str, mode: &DirectiveFilterMode) -> String {
    if mode == &DirectiveFilterMode::All {
        return input.to_string();
    }

    let mut result = String::new();
    let mut state = ScannerState::Normal;
    let mut escaped = false;
    let mut in_directive = false;
    let mut directive_buffer = String::new();
    let mut paren_depth: i32 = 0;

    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];

        match state {
            ScannerState::BlockString => {
                // Block strings have no escape processing; the terminator is
                // exactly three quotes. Everything else is literal text.
                if ch == '"' && chars.get(i + 1) == Some(&'"') && chars.get(i + 2) == Some(&'"') {
                    let target: &mut String = if in_directive {
                        &mut directive_buffer
                    } else {
                        &mut result
                    };
                    target.push_str("\"\"\"");
                    i += 2;
                    state = ScannerState::Normal;
                } else {
                    let target: &mut String = if in_directive {
                        &mut directive_buffer
                    } else {
                        &mut result
                    };
                    target.push(ch);
                }
            }
            ScannerState::SingleQuotedString | ScannerState::DoubleQuotedString => {
                let target: &mut String = if in_directive {
                    &mut directive_buffer
                } else {
                    &mut result
                };
                target.push(ch);
                if escaped {
                    escaped = false;
                } else if ch == '\\' {
                    escaped = true;
                } else if (state == ScannerState::SingleQuotedString && ch == '\'')
                    || (state == ScannerState::DoubleQuotedString && ch == '"')
                {
                    state = ScannerState::Normal;
                }
            }
            ScannerState::Normal => {
                if ch == '\n' {
                    if in_directive {
                        finish_directive(
                            &mut result,
                            &mut directive_buffer,
                            &mut paren_depth,
                            mode,
                        );
                        in_directive = false;
                    }
                    trim_current_line_end(&mut result);
                    result.push('\n');
                } else if ch == '"'
                    && chars.get(i + 1) == Some(&'"')
                    && chars.get(i + 2) == Some(&'"')
                {
                    let target: &mut String = if in_directive {
                        &mut directive_buffer
                    } else {
                        &mut result
                    };
                    target.push_str("\"\"\"");
                    i += 2;
                    state = ScannerState::BlockString;
                } else if ch == '"' || ch == '\'' {
                    let target: &mut String = if in_directive {
                        &mut directive_buffer
                    } else {
                        &mut result
                    };
                    target.push(ch);
                    state = if ch == '"' {
                        ScannerState::DoubleQuotedString
                    } else {
                        ScannerState::SingleQuotedString
                    };
                    escaped = false;
                } else if ch == '@' && !in_directive {
                    in_directive = true;
                    directive_buffer.clear();
                    directive_buffer.push(ch);
                } else if in_directive {
                    directive_buffer.push(ch);
                    if ch == '(' {
                        paren_depth += 1;
                    } else if ch == ')' {
                        paren_depth -= 1;
                        if paren_depth == 0 {
                            finish_directive(
                                &mut result,
                                &mut directive_buffer,
                                &mut paren_depth,
                                mode,
                            );
                            in_directive = false;
                        }
                    } else if paren_depth == 0 && ch.is_whitespace() {
                        let name = directive_buffer.trim_start_matches('@').trim();
                        if should_include_directive(name, mode) {
                            result.push_str(&directive_buffer);
                        }
                        result.push(ch);
                        in_directive = false;
                        directive_buffer.clear();
                    }
                } else {
                    result.push(ch);
                }
            }
        }
        i += 1;
    }

    if in_directive && !directive_buffer.is_empty() {
        finish_directive(&mut result, &mut directive_buffer, &mut paren_depth, mode);
    }

    if state == ScannerState::Normal {
        trim_current_line_end(&mut result);
    }
    result
}

/// Filter directive tokens from a single line of SDL output.
///
/// Given a line like `  id: ID! @key(fields: "id") @shareable`,
/// strips directives that should be excluded based on the mode.
/// `@` inside string literals and block strings is preserved.
pub fn filter_line_directives(line: &str, mode: &DirectiveFilterMode) -> String {
    filter_directives(line, mode)
}

/// Apply directive filtering to an entire SDL string.
///
/// Scans the whole document in a single pass so scanner state (in
/// particular block strings) carries across lines.
pub fn filter_sdl_directives(sdl: &str, mode: &DirectiveFilterMode) -> String {
    filter_directives(sdl, mode)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_directive() {
        assert_eq!(classify_directive("@deprecated"), DirectiveTier::Spec);
        assert_eq!(classify_directive("@key"), DirectiveTier::Federation);
        assert_eq!(classify_directive("@shareable"), DirectiveTier::Federation);
        assert_eq!(classify_directive("@constraint"), DirectiveTier::Custom);
    }

    #[test]
    fn test_should_include_all_mode() {
        assert!(should_include_directive("@key", &DirectiveFilterMode::All));
        assert!(should_include_directive(
            "@deprecated",
            &DirectiveFilterMode::All
        ));
        assert!(should_include_directive(
            "@custom",
            &DirectiveFilterMode::All
        ));
    }

    #[test]
    fn test_should_include_viewer_friendly() {
        // Only spec directives pass
        assert!(should_include_directive(
            "@deprecated",
            &DirectiveFilterMode::ViewerFriendly
        ));
        assert!(!should_include_directive(
            "@key",
            &DirectiveFilterMode::ViewerFriendly
        ));
        assert!(!should_include_directive(
            "@shareable",
            &DirectiveFilterMode::ViewerFriendly
        ));
    }

    #[test]
    fn test_should_include_exclude_draft() {
        // Everything except draft passes
        assert!(should_include_directive(
            "@key",
            &DirectiveFilterMode::ExcludeDraft
        ));
        assert!(should_include_directive(
            "@deprecated",
            &DirectiveFilterMode::ExcludeDraft
        ));
    }

    #[test]
    fn test_should_include_custom_exclusion() {
        let mode = DirectiveFilterMode::Custom(vec!["@key".to_string()]);
        assert!(!should_include_directive("@key", &mode));
        assert!(should_include_directive("@shareable", &mode));
    }

    #[test]
    fn test_filter_line_directives_viewer_friendly() {
        let line = "  id: ID! @key(fields: \"id\") @deprecated";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("@deprecated"));
        assert!(!result.contains("@key"));
    }

    #[test]
    fn test_filter_line_directives_all_mode_is_noop() {
        let line = "  id: ID! @key(fields: \"id\") @shareable";
        let result = filter_line_directives(line, &DirectiveFilterMode::All);
        assert_eq!(result, line);
    }

    #[test]
    fn test_filter_line_directives_with_arg_directive() {
        let line = "type User @key(fields: \"id\") @shareable {";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(!result.contains("@key"));
        assert!(!result.contains("@shareable"));
        assert!(result.contains("type User"));
    }

    #[test]
    fn test_filter_sdl_directives_full() {
        let sdl =
            "type User @key(fields: \"id\") {\n  id: ID! @deprecated\n  name: String @shareable\n}";
        let result = filter_sdl_directives(sdl, &DirectiveFilterMode::ViewerFriendly);
        assert!(!result.contains("@key"));
        assert!(!result.contains("@shareable"));
        assert!(result.contains("@deprecated"));
    }

    #[test]
    fn test_filter_directive_list() {
        let directives = vec![
            "@key(fields: \"id\")".to_string(),
            "@deprecated".to_string(),
            "@shareable".to_string(),
        ];
        let result = filter_directive_list(&directives, &DirectiveFilterMode::ViewerFriendly);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "@deprecated");
    }

    #[test]
    fn at_sign_inside_string_is_preserved() {
        let line = "  \"Contact support@acme.com for help\"";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("support@acme.com"));
    }

    #[test]
    fn at_sign_inside_argument_default_is_preserved() {
        let line = "  email(notify: String = \"a@b.com\"): String @shareable";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("= \"a@b.com\""));
        assert!(!result.contains("@shareable"));
    }

    #[test]
    fn parens_inside_string_arguments_do_not_break_boundaries() {
        // The kept directive's string argument contains parens; the dropped
        // directive is removed as a whole unit despite parens in its arg.
        let line = "type User @key(fields: \"a(b)\") @deprecated";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(!result.contains("@key"));
        assert!(result.contains("@deprecated"));
        assert!(result.contains("type User"));
    }

    #[test]
    fn at_sign_inside_block_string_description_is_preserved() {
        let sdl = "type User \"\"\"\nContact support@acme.com\nor admin@site.org\n\"\"\" @shareable {\n  id: ID!\n}";
        let result = filter_sdl_directives(sdl, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("support@acme.com"));
        assert!(result.contains("admin@site.org"));
        assert!(!result.contains("@shareable"));
        assert!(result.contains("id: ID!"));
    }

    #[test]
    fn escaped_quote_does_not_corrupt_scanner_state() {
        // The description contains an escaped quote followed by an @; the
        // directive after the string must still be filtered as a directive.
        let line = "  name: String \"a\\\"@b\" @shareable";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("a\\\"@b"));
        assert!(!result.contains("@shareable"));
    }

    #[test]
    fn directive_after_string_containing_at_sign_is_still_filtered() {
        let line = "  name: String \"desc with @here\" @shareable";
        let result = filter_line_directives(line, &DirectiveFilterMode::ViewerFriendly);
        assert!(result.contains("@here"));
        assert!(!result.contains("@shareable"));
    }
}
