// @ts-nocheck

import { InContextSdkMethod } from "@graphql-mesh/types";
import { MeshContext } from "@graphql-mesh/runtime";

export namespace ProductsTypes {
  export type Maybe<T> = T | null;
  export type InputMaybe<T> = Maybe<T>;
  export type Exact<T extends { [key: string]: unknown }> = {
    [K in keyof T]: T[K];
  };
  export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
  };
  export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]: Maybe<T[SubKey]>;
  };
  export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
    [_ in K]?: never;
  };
  export type Incremental<T> =
    | T
    | {
        [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
      };
  /** All built-in and custom scalars, mapped to their actual values */
  export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    _Any: { input: any; output: any };
    _FieldSet: { input: any; output: any };
    link__Import: { input: any; output: any };
  };

  export type link__Purpose = "SECURITY" | "EXECUTION";

  export type _Service = {
    sdl: Scalars["String"]["output"];
  };

  export type Query = {
    /** Get a product by UPC */
    product?: Maybe<Product>;
    /** Get all products */
    products: Array<Product>;
  };

  export type QueryproductArgs = {
    upc: Scalars["String"]["input"];
  };

  /** Product in the catalog */
  export type Product = {
    /** Universal Product Code (primary key) */
    upc: Scalars["String"]["output"];
    /** Product name */
    name?: Maybe<Scalars["String"]["output"]>;
    /** Product price in cents */
    price?: Maybe<Scalars["Int"]["output"]>;
    /** Product weight in grams */
    weight?: Maybe<Scalars["Int"]["output"]>;
  };

  export type QuerySdk = {
    /** Get a product by UPC **/
    product: InContextSdkMethod<Query["product"], QueryproductArgs, MeshContext>;
    /** Get all products **/
    products: InContextSdkMethod<Query["products"], {}, MeshContext>;
  };

  export type MutationSdk = {};

  export type SubscriptionSdk = {};

  export type Context = {
    ["products"]: {
      Query: QuerySdk;
      Mutation: MutationSdk;
      Subscription: SubscriptionSdk;
    };
  };
}
