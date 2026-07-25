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

/// Filter directive tokens from a single line of SDL output.
///
/// Given a line like `  id: ID! @key(fields: "id") @shareable`,
/// strips directives that should be excluded based on the mode.
pub fn filter_line_directives(line: &str, mode: &DirectiveFilterMode) -> String {
    if mode == &DirectiveFilterMode::All {
        return line.to_string();
    }

    let mut result = String::new();
    let mut in_directive = false;
    let mut directive_buffer = String::new();
    let mut paren_depth: i32 = 0;

    for ch in line.chars() {
        if ch == '@' && !in_directive {
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
                    // End of directive; decide whether to include
                    let name = directive_buffer
                        .trim_start_matches('@')
                        .split(|c: char| c == '(' || c.is_whitespace())
                        .next()
                        .unwrap_or(&directive_buffer);
                    if should_include_directive(name, mode) {
                        result.push_str(&directive_buffer);
                    }
                    in_directive = false;
                    directive_buffer.clear();
                }
            } else if paren_depth == 0 && ch.is_whitespace() {
                // Simple directive without parens ended
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

    // Handle trailing directive without whitespace
    if in_directive && !directive_buffer.is_empty() {
        let name = directive_buffer
            .trim_start_matches('@')
            .split(|c: char| c == '(' || c.is_whitespace())
            .next()
            .unwrap_or(&directive_buffer);
        if should_include_directive(name, mode) {
            result.push_str(&directive_buffer);
        }
    }

    // Clean up trailing whitespace
    result.trim_end().to_string()
}

/// Apply directive filtering to an entire SDL string.
///
/// Process each line and strip excluded directives.
pub fn filter_sdl_directives(sdl: &str, mode: &DirectiveFilterMode) -> String {
    if mode == &DirectiveFilterMode::All {
        return sdl.to_string();
    }
    sdl.lines()
        .map(|line| filter_line_directives(line, mode))
        .collect::<Vec<_>>()
        .join("\n")
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
}
