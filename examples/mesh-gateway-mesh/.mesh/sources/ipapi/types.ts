// @ts-nocheck

import type { InContextSdkMethod } from '@graphql-mesh/types';

export namespace IpapiTypes {
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

export type GeocodedLocation = {
  city?: Maybe<Scalars['String']['output']>;
  countryName?: Maybe<Scalars['String']['output']>;
  principalSubdivision?: Maybe<Scalars['String']['output']>;
  postcode?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  latitude: Scalars['String']['output'];
  longitude: Scalars['String']['output'];
};

export type IpLocation = {
  ip?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['String']['output']>;
  isp?: Maybe<Scalars['String']['output']>;
  org?: Maybe<Scalars['String']['output']>;
  autonomousSystem?: Maybe<Scalars['String']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  details?: Maybe<GeocodedLocation>;
};

export type Query = {
  /** Geocodes an IP address to coordinates and ISP details. */
  geocodeIP?: Maybe<IpLocation>;
};


export type QuerygeocodeIPArgs = {
  ip: Scalars['String']['input'];
};

  export type QuerySdk = {
      /** Geocodes an IP address to coordinates and ISP details. **/

  geocodeIP: InContextSdkMethod<Query['geocodeIP'], QuerygeocodeIPArgs, BaseMeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["ipapi"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
