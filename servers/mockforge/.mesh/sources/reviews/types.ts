// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace ReviewsTypes {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  _Any: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
  link__Import: { input: any; output: any; }
};

export type link__Purpose =
  | 'SECURITY'
  | 'EXECUTION';

export type _Service = {
  sdl: Scalars['String']['output'];
};

export type Query = {
  /** Get a review by ID */
  review?: Maybe<Review>;
  /** Get all reviews */
  reviews: Array<Review>;
};


export type QueryreviewArgs = {
  id: Scalars['ID']['input'];
};

/** Product review entity */
export type Review = {
  /** Review unique identifier */
  id: Scalars['ID']['output'];
  /** Review body text */
  body?: Maybe<Scalars['String']['output']>;
  /** Review author (provides username field) */
  author?: Maybe<User>;
  /** Product being reviewed */
  product?: Maybe<Product>;
};

/** Extended User type with reviews */
export type User = {
  /** User's email address (from Users service) */
  email: Scalars['ID']['output'];
  /** Reviews written by this user */
  reviews?: Maybe<Array<Maybe<Review>>>;
};

/** Extended Product type with reviews */
export type Product = {
  /** Universal Product Code (from Products service) */
  upc: Scalars['String']['output'];
  /** Reviews for this product */
  reviews?: Maybe<Array<Maybe<Review>>>;
};

  export type QuerySdk = {
      /** Get a review by ID **/
  review: InContextSdkMethod<Query['review'], QueryreviewArgs, MeshContext>,
  /** Get all reviews **/
  reviews: InContextSdkMethod<Query['reviews'], {}, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["reviews"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
