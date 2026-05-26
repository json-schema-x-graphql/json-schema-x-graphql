// @ts-nocheck

import type { InContextSdkMethod } from '@graphql-mesh/types';

export namespace ZippopotamTypes {
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
};

export type ZipPlace = {
  placeName?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  state?: Maybe<Scalars['String']['output']>;
  stateAbbreviation?: Maybe<Scalars['String']['output']>;
  details?: Maybe<GeocodedLocation>;
};

export type GeocodedLocation = {
  city?: Maybe<Scalars['String']['output']>;
  countryName?: Maybe<Scalars['String']['output']>;
  principalSubdivision?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  latitude: Scalars['String']['output'];
  longitude: Scalars['String']['output'];
};

export type ZipLocation = {
  postcode?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  places?: Maybe<Array<Maybe<ZipPlace>>>;
};

export type Query = {
  /** Geocodes a ZIP code to coordinates and place details. */
  geocodeZip?: Maybe<ZipLocation>;
};


export type QuerygeocodeZipArgs = {
  zip: Scalars['String']['input'];
  countryCode: Scalars['String']['input'];
};

  export type QuerySdk = {
      /** Geocodes a ZIP code to coordinates and place details. **/

  geocodeZip: InContextSdkMethod<Query['geocodeZip'], QuerygeocodeZipArgs, BaseMeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["zippopotam"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
