use json_schema_x_graphql::error::ConversionError;

#[test]
fn test_conversion_error_display() {
    let err = ConversionError::InvalidJsonSchema("EOF".to_string());
    assert_eq!(format!("{}", err), "Invalid JSON Schema: EOF");

    let err = ConversionError::InvalidGraphQLSdl("syntax error".to_string());
    assert_eq!(format!("{}", err), "Invalid GraphQL SDL: syntax error");

    let err = ConversionError::InvalidField("missing type".to_string());
    assert_eq!(format!("{}", err), "Invalid field definition: missing type");

    let err = ConversionError::UnsupportedFeature("feature X".to_string());
    assert_eq!(format!("{}", err), "Unsupported feature: feature X");
}

#[test]
fn test_from_serde_json_error() {
    let json_err = serde_json::from_str::<serde_json::Value>("{").unwrap_err();
    let err: ConversionError = json_err.into();

    match err {
        ConversionError::JsonError(msg) => {
            assert!(msg.contains("EOF") || msg.contains("end of input"));
        }
        _ => panic!("Expected JsonError variant"),
    }
}
