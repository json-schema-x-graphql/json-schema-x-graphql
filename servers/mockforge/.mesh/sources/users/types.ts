// @ts-nocheck

import { InContextSdkMethod } from "@graphql-mesh/types";
import { MeshContext } from "@graphql-mesh/runtime";

export namespace UsersTypes {
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
    /** Get a user by email */
    user?: Maybe<User>;
    /** Get all users */
    users: Array<User>;
  };

  export type QueryuserArgs = {
    email: Scalars["ID"]["input"];
  };

  /** User account in the system */
  export type User = {
    /** User's email address (primary key) */
    email: Scalars["ID"]["output"];
    /** User's display name */
    name?: Maybe<Scalars["String"]["output"]>;
    /** Unique username for the account */
    username?: Maybe<Scalars["String"]["output"]>;
    /** User's date of birth */
    birthDate?: Maybe<Scalars["String"]["output"]>;
  };

  export type QuerySdk = {
    /** Get a user by email **/
    user: InContextSdkMethod<Query["user"], QueryuserArgs, MeshContext>;
    /** Get all users **/
    users: InContextSdkMethod<Query["users"], {}, MeshContext>;
  };

  export type MutationSdk = {};

  export type SubscriptionSdk = {};

  export type Context = {
    ["users"]: {
      Query: QuerySdk;
      Mutation: MutationSdk;
      Subscription: SubscriptionSdk;
    };
  };
}
