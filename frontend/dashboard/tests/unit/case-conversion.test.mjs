import {
  camelToSnake,
  snakeToCamel,
  convertObjectKeys,
  convertGraphQLFields,
} from "../../scripts/helpers/case-conversion.mjs";

describe("Case Conversion Utilities", () => {
  test("camelToSnake converts CamelCase to snake_case", () => {
    expect(camelToSnake("contractingAgencyCode")).toBe("contracting_agency_code");
    expect(camelToSnake("VendorInfo")).toBe("vendor_info");
    expect(camelToSnake("placeOfPerformance")).toBe("place_of_performance");
    expect(camelToSnake("simple")).toBe("simple");
  });

  test("snakeToCamel converts snake_case to camelCase", () => {
    expect(snakeToCamel("contracting_agency_code")).toBe("contractingAgencyCode");
    expect(snakeToCamel("vendor_info")).toBe("vendorInfo");
    expect(snakeToCamel("place_of_performance")).toBe("placeOfPerformance");
    expect(snakeToCamel("simple")).toBe("simple");
  });

  test("convertObjectKeys recursively converts object keys", () => {
    const obj = {
      contractingAgencyCode: "123",
      vendorInfo: {
        vendorName: "Acme",
        vendorId: 42,
      },
      items: [
        { itemCode: "A", itemValue: 1 },
        { itemCode: "B", itemValue: 2 },
      ],
    };
    const snakeObj = convertObjectKeys(obj, camelToSnake);
    expect(snakeObj).toEqual({
      contracting_agency_code: "123",
      vendor_info: {
        vendor_name: "Acme",
        vendor_id: 42,
      },
      items: [
        { item_code: "A", item_value: 1 },
        { item_code: "B", item_value: 2 },
      ],
    });
  });

  test("convertGraphQLFields converts field names in SDL", () => {
    const sdl = `type Contract {
  contractingAgencyCode: String
  vendorInfo: Vendor
  placeOfPerformance: Location
}`;
    const converted = convertGraphQLFields(sdl, camelToSnake);
    expect(converted).toContain("contracting_agency_code: String");
    expect(converted).toContain("vendor_info: Vendor");
    expect(converted).toContain("place_of_performance: Location");
  });
});
