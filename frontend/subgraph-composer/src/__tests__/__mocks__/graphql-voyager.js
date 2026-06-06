// Mock graphql-voyager for jest tests
export const Voyager = jest.fn(() => null);
export const sdlToSchema = jest.fn((sdl) => {
  // Return a minimal mock schema object
  return {
    __mockSchema: true,
    sdl,
    getQueryType: () => ({ name: "Query" }),
    getTypeMap: () => ({}),
  };
});
export const voyagerIntrospectionQuery = jest.fn(
  () => "{ __schema { types { name } } }",
);
