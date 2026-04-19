// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, ExecuteMeshFn, SubscribeMeshFn, MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { ImportFn } from '@graphql-mesh/types';
import type { ProductsTypes } from './sources/products/types';
import type { ReviewsTypes } from './sources/reviews/types';
import type { UsersTypes } from './sources/users/types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };



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

export type Query = {
  /** Get a product by UPC */
  product?: Maybe<Product>;
  /** Get all products */
  products: Array<Product>;
  /** Get a review by ID */
  review?: Maybe<Review>;
  /** Get all reviews */
  reviews: Array<Review>;
  /** Get a user by email */
  user?: Maybe<User>;
  /** Get all users */
  users: Array<User>;
};


export type QueryproductArgs = {
  upc: Scalars['String']['input'];
};


export type QueryreviewArgs = {
  id: Scalars['ID']['input'];
};


export type QueryuserArgs = {
  email: Scalars['ID']['input'];
};

export type link__Purpose =
  | 'SECURITY'
  | 'EXECUTION';

export type _Service = {
  sdl: Scalars['String']['output'];
};

/** Extended Product type with reviews */
export type Product = {
  /** Universal Product Code (from Products service) */
  upc: Scalars['String']['output'];
  /** Product name */
  name?: Maybe<Scalars['String']['output']>;
  /** Product price in cents */
  price?: Maybe<Scalars['Int']['output']>;
  /** Product weight in grams */
  weight?: Maybe<Scalars['Int']['output']>;
  /** Reviews for this product */
  reviews?: Maybe<Array<Maybe<Review>>>;
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

/** User account in the system */
export type User = {
  /** User's email address (primary key) */
  email: Scalars['ID']['output'];
  /** Reviews written by this user */
  reviews?: Maybe<Array<Maybe<Review>>>;
  /** User's display name */
  name?: Maybe<Scalars['String']['output']>;
  /** Unique username for the account */
  username?: Maybe<Scalars['String']['output']>;
  /** User's date of birth */
  birthDate?: Maybe<Scalars['String']['output']>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>;
  _Any: ResolverTypeWrapper<Scalars['_Any']['output']>;
  _FieldSet: ResolverTypeWrapper<Scalars['_FieldSet']['output']>;
  link__Import: ResolverTypeWrapper<Scalars['link__Import']['output']>;
  link__Purpose: link__Purpose;
  _Service: ResolverTypeWrapper<_Service>;
  Product: ResolverTypeWrapper<Product>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Review: ResolverTypeWrapper<Review>;
  User: ResolverTypeWrapper<User>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Query: {};
  _Any: Scalars['_Any']['output'];
  _FieldSet: Scalars['_FieldSet']['output'];
  link__Import: Scalars['link__Import']['output'];
  _Service: _Service;
  Product: Product;
  Int: Scalars['Int']['output'];
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Review: Review;
  User: User;
}>;

export type externalDirectiveArgs = { };

export type externalDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = externalDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type requiresDirectiveArgs = {
  fields: Scalars['String']['input'];
};

export type requiresDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = requiresDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type providesDirectiveArgs = {
  fields: Scalars['String']['input'];
};

export type providesDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = providesDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type keyDirectiveArgs = {
  fields: Scalars['String']['input'];
  resolvable?: Maybe<Scalars['Boolean']['input']>;
};

export type keyDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = keyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type linkDirectiveArgs = {
  url: Scalars['String']['input'];
  as?: Maybe<Scalars['String']['input']>;
  for?: Maybe<link__Purpose>;
  import?: Maybe<Array<Maybe<Scalars['String']['input']>>>;
};

export type linkDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = linkDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type shareableDirectiveArgs = { };

export type shareableDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = shareableDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type inaccessibleDirectiveArgs = { };

export type inaccessibleDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = inaccessibleDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type tagDirectiveArgs = {
  name: Scalars['String']['input'];
};

export type tagDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = tagDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type overrideDirectiveArgs = {
  from: Scalars['String']['input'];
};

export type overrideDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = overrideDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type composeDirectiveDirectiveArgs = {
  name: Scalars['String']['input'];
};

export type composeDirectiveDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = composeDirectiveDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type extendsDirectiveArgs = { };

export type extendsDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = extendsDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type interfaceObjectDirectiveArgs = { };

export type interfaceObjectDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = interfaceObjectDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryproductArgs, 'upc'>>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryreviewArgs, 'id'>>;
  reviews?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryuserArgs, 'email'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export interface _AnyScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['_Any'], any> {
  name: '_Any';
}

export interface _FieldSetScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['_FieldSet'], any> {
  name: '_FieldSet';
}

export interface link__ImportScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['link__Import'], any> {
  name: 'link__Import';
}

export type _ServiceResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Service'] = ResolversParentTypes['_Service']> = ResolversObject<{
  sdl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  upc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  reviews?: Resolver<Maybe<Array<Maybe<ResolversTypes['Review']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  body?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  author?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  email?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reviews?: Resolver<Maybe<Array<Maybe<ResolversTypes['Review']>>>, ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  username?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  birthDate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  Query?: QueryResolvers<ContextType>;
  _Any?: GraphQLScalarType;
  _FieldSet?: GraphQLScalarType;
  link__Import?: GraphQLScalarType;
  _Service?: _ServiceResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = MeshContext> = ResolversObject<{
  external?: externalDirectiveResolver<any, any, ContextType>;
  requires?: requiresDirectiveResolver<any, any, ContextType>;
  provides?: providesDirectiveResolver<any, any, ContextType>;
  key?: keyDirectiveResolver<any, any, ContextType>;
  link?: linkDirectiveResolver<any, any, ContextType>;
  shareable?: shareableDirectiveResolver<any, any, ContextType>;
  inaccessible?: inaccessibleDirectiveResolver<any, any, ContextType>;
  tag?: tagDirectiveResolver<any, any, ContextType>;
  override?: overrideDirectiveResolver<any, any, ContextType>;
  composeDirective?: composeDirectiveDirectiveResolver<any, any, ContextType>;
  extends?: extendsDirectiveResolver<any, any, ContextType>;
  interfaceObject?: interfaceObjectDirectiveResolver<any, any, ContextType>;
}>;

export type MeshContext = ProductsTypes.Context & ReviewsTypes.Context & UsersTypes.Context & BaseMeshContext;


import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '..');

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {
    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore('.mesh', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: "ts",
}), {
  readonly: true,
  validate: false
});

export function getMeshOptions() {
  console.warn('WARNING: These artifacts are built for development mode. Please run "mesh build" to build production artifacts');
  return findAndParseConfig({
    dir: baseDir,
    artifactsDir: ".mesh",
    configName: "mesh",
    additionalPackagePrefixes: [],
    initialLoggerPrefix: "🕸️  Mesh",
  });
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltMesh,
    rawServeConfig: {"port":5050,"cors":{"origin":"*"}},
  })
}

let meshInstance$: Promise<MeshInstance> | undefined;

export const pollingInterval = null;

export function getBuiltMesh(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    if (pollingInterval) {
      setInterval(() => {
        getMeshOptions()
        .then(meshOptions => getMesh(meshOptions))
        .then(newMesh =>
          meshInstance$.then(oldMesh => {
            oldMesh.destroy()
            meshInstance$ = Promise.resolve(newMesh)
          })
        ).catch(err => {
          console.error("Mesh polling failed so the existing version will be used:", err);
        });
      }, pollingInterval)
    }
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltMesh().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltMesh().then(({ subscribe }) => subscribe(...args));