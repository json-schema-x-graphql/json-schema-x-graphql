//! Case conversion utilities for flexible field name handling

/// Convert camelCase or PascalCase to snake_case
pub fn camel_to_snake(s: &str) -> String {
    let mut snake = String::with_capacity(s.len() + 4);
    let mut chars = s.chars().peekable();
    let mut prev_was_lower_or_digit = false;
    
    while let Some(ch) = chars.next() {
        if ch.is_uppercase() {
            if prev_was_lower_or_digit {
                snake.push('_');
            } else if let Some(next) = chars.peek() {
                if next.is_lowercase() && !snake.is_empty() {
                    snake.push('_');
                }
            }
            snake.extend(ch.to_lowercase());
            prev_was_lower_or_digit = false;
        } else {
            snake.push(ch);
            prev_was_lower_or_digit = ch.is_lowercase() || ch.is_ascii_digit();
        }
    }
    snake
}

/// Convert snake_case to camelCase
pub fn snake_to_camel(s: &str) -> String {
    let mut camel = String::with_capacity(s.len());
    let mut next_upper = false;
    for ch in s.chars() {
        if ch == '_' {
            next_upper = true;
        } else if next_upper {
            camel.extend(ch.to_uppercase());
            next_upper = false;
        } else {
            camel.push(ch);
        }
    }
    camel
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_camel_to_snake() {
        assert_eq!(camel_to_snake("camelCase"), "camel_case");
        assert_eq!(camel_to_snake("PascalCase"), "pascal_case");
        assert_eq!(camel_to_snake("HTTPResponse"), "http_response");
        assert_eq!(camel_to_snake("http2Protocol"), "http2_protocol");
    }

    #[test]
    fn test_snake_to_camel() {
        assert_eq!(snake_to_camel("snake_case"), "snakeCase");
        assert_eq!(snake_to_camel("http_response"), "httpResponse");
    }
}
