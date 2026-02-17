//! Case conversion utilities for flexible field name handling

use regex::Regex;

/// Convert camelCase or PascalCase to snake_case
pub fn camel_to_snake(s: &str) -> String {
    let re1 = Regex::new(r"([a-z0-9])([A-Z])").unwrap();
    let re2 = Regex::new(r"([A-Z])([A-Z][a-z])").unwrap();

    let temp = re1.replace_all(s, "${1}_${2}");
    let result = re2.replace_all(&temp, "${1}_${2}");

    result.to_lowercase()
}

/// Convert snake_case to camelCase
pub fn snake_to_camel(s: &str) -> String {
    let re = Regex::new(r"_([a-zA-Z0-9])").unwrap();

    re.replace_all(s, |caps: &regex::Captures| caps[1].to_uppercase())
        .to_string()
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
