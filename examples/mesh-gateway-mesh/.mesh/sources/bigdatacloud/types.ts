// @ts-nocheck

import type { InContextSdkMethod } from '@graphql-mesh/types';

export namespace BigdatacloudTypes {
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
  link__Import: { input: any; output: any; }
  federation__FieldSet: { input: any; output: any; }
  federation__Scope: { input: any; output: any; }
  federation__Policy: { input: any; output: any; }
  federation__ContextFieldValue: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

export type Administrativedivision = {
  name?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  isoName?: Maybe<Scalars['String']['output']>;
  order?: Maybe<Scalars['Int']['output']>;
  adminLevel?: Maybe<Scalars['Int']['output']>;
  isoCode?: Maybe<Scalars['String']['output']>;
  wikidataId?: Maybe<Scalars['String']['output']>;
  geonameId?: Maybe<Scalars['Int']['output']>;
};

export type Localityinfo = {
  administrative?: Maybe<Array<Maybe<Administrativedivision>>>;
};

export type GeocodedLocation = {
  latitude: Scalars['String']['output'];
  longitude: Scalars['String']['output'];
  countryName?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  principalSubdivision?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  locality?: Maybe<Scalars['String']['output']>;
  postcode?: Maybe<Scalars['String']['output']>;
  continent?: Maybe<Scalars['String']['output']>;
  localityInfo?: Maybe<Localityinfo>;
};

export type link__Purpose =
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  | 'SECURITY'
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  | 'EXECUTION';

export type _Service = {
  sdl?: Maybe<Scalars['String']['output']>;
};

export type _Entity = GeocodedLocation;

export type Query = {
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
};


export type Query_entitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};

  export type QuerySdk = {
        _entities: InContextSdkMethod<[GeocodedLocation]!, Query_entitiesArgs, BaseMeshContext>,
  
  _service: InContextSdkMethod<Query['_service'], {}, BaseMeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["bigdatacloud"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
