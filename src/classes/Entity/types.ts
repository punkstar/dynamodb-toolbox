import type { DocumentClient } from 'aws-sdk/clients/dynamodb'
import type { A, O, F } from 'ts-toolbelt'

import type { Compute, FirstDefined, If } from '../../lib/utils'
import type { And, Cast, Dictionary, Equals, Key, Or } from '../../lib/ts-utils';
import type { DynamoDBKeyTypes, DynamoDBTypes, $QueryOptions, TableDef } from '../Table';
import type Entity from './Entity'

export interface EntityConstructor<
  EntityTable extends TableDef | undefined = undefined,
  Name extends string = string,
  AutoExecute extends boolean = true,
  AutoParse extends boolean = true,
  Timestamps extends boolean = true,
  CreatedAlias extends string = 'created',
  ModifiedAlias extends string = 'modified',
  TypeAlias extends string = 'entity',
  TypeHidden extends boolean = false,
  ReadonlyAttributeDefinitions extends Readonly<AttributeDefinitions> = Readonly<AttributeDefinitions>
> {
  table?: EntityTable
  name: Name
  timestamps?: Timestamps
  created?: string
  modified?: string
  createdAlias?: CreatedAlias
  modifiedAlias?: ModifiedAlias
  typeAlias?: TypeAlias
  typeHidden?: TypeHidden
  attributes: ReadonlyAttributeDefinitions
  autoExecute?: AutoExecute
  autoParse?: AutoParse
}

export type KeyAttributeDefinition = {
  type: 'string' | 'number' | 'binary'
  // 🔨 TOIMPROVE: Probably typable
  default: any
  hidden: boolean
  delimiter: string
  prefix: string
  suffix: string
  onUpdate: boolean
  dependsOn: string | string[]
  transform: (value: any, data: any) => any,
  format: (value: any, data: any) => any,
  coerce: boolean
  // 💥 TODO: Are following options forbidden in KeyAttributeDefinitions ?
  save: never
  required: never
  alias: never
  map: never
  setType: never
}

export type PartitionKeyDefinition = Partial<KeyAttributeDefinition> & {
  partitionKey: true
  sortKey?: false
}

export type GSIPartitionKeyDefinition = Partial<KeyAttributeDefinition> & {
  partitionKey: string
  sortKey?: false
}

export type SortKeyDefinition = Partial<KeyAttributeDefinition> & {
  sortKey: true
  partitionKey?: false
}

export type GSISortKeyDefinition = Partial<KeyAttributeDefinition> & {
  partitionKey?: false
  sortKey: string
}

export type PureAttributeDefinition = Partial<{
  partitionKey: false
  sortKey: false
  type: DynamoDBTypes
  // 🔨 TOIMPROVE: Probably typable
  default: any | ((data: object) => any)
  dependsOn: string | string[]
  // 🔨 TOIMPROVE: Probably typable
  transform: (value: any, data: {}) => any
  format: (value: any, data: {}) => any
  coerce: boolean
  save: boolean
  onUpdate: boolean
  hidden: boolean
  required: boolean | 'always'
  alias: string
  map: string
  setType: DynamoDBKeyTypes
  delimiter: string
  prefix: string
  suffix: string
}>

export type CompositeAttributeDefinition =
  | [string, number]
  | [string, number, DynamoDBTypes]
  | [string, number, PureAttributeDefinition]

export type AttributeDefinition =
  | DynamoDBTypes
  | PartitionKeyDefinition
  | SortKeyDefinition
  | GSIPartitionKeyDefinition
  | GSISortKeyDefinition
  | PureAttributeDefinition
  | CompositeAttributeDefinition

export type AttributeDefinitions = Record<Key, AttributeDefinition>

export type InferKeyAttribute<
  Definitions extends AttributeDefinitions,
  KeyType extends 'partitionKey' | 'sortKey'
> = O.SelectKeys<Definitions, Record<KeyType, true>>

export type InferMappedAttributes<
  Definitions extends AttributeDefinitions,
  AttributeName extends Key
> = O.SelectKeys<Definitions, [AttributeName, any, any?]>

export interface ParsedAttributes<Attributes extends Key = Key> {
  aliases: Attributes
  all: Attributes
  default: Attributes
  key: {
    partitionKey: { pure: Attributes; dependsOn: Attributes; mapped: Attributes; all: Attributes }
    sortKey: { pure: Attributes; dependsOn: Attributes; mapped: Attributes; all: Attributes }
    all: Attributes
  }
  always: { all: Attributes; default: Attributes; input: Attributes }
  required: { all: Attributes; default: Attributes; input: Attributes }
  optional: Attributes
  shown: Attributes
}

export type GetDependsOnAttributes<A extends AttributeDefinition> = A extends { dependsOn: Key }
  ? A['dependsOn']
  : A extends { dependsOn: Key[] }
  ? A['dependsOn'][number]
  : never

export type ParseAttributes<
  Definitions extends AttributeDefinitions,
  Timestamps extends boolean,
  CreatedAlias extends string,
  ModifiedAlias extends string,
  TypeAlias extends string,
  TypeHidden extends boolean,
  Aliases extends string =
    | (Timestamps extends true ? CreatedAlias | ModifiedAlias : never)
    | TypeAlias,
  Default extends Key =
    | O.SelectKeys<Definitions, { default: any } | [any, any, { default: any }]>
    | Aliases,
  PK extends Key = InferKeyAttribute<Definitions, 'partitionKey'>,
  PKDependsOn extends Key = GetDependsOnAttributes<Definitions[PK]>,
  PKMappedAttribute extends Key = InferMappedAttributes<Definitions, PK>,
  SK extends Key = InferKeyAttribute<Definitions, 'sortKey'>,
  SKDependsOn extends Key = GetDependsOnAttributes<Definitions[SK]>,
  SKMappedAttribute extends Key = InferMappedAttributes<Definitions, SK>,
  KeyAttributes extends Key = PK | PKMappedAttribute | SK | SKMappedAttribute,
  AlwaysAttributes extends Key = Exclude<
    | O.SelectKeys<Definitions, { required: 'always' } | [any, any, { required: 'always' }]>
    | (Timestamps extends true ? ModifiedAlias : never),
    KeyAttributes
  >,
  RequiredAttributes extends Key = Exclude<
    | O.SelectKeys<Definitions, { required: true } | [any, any, { required: true }]>
    | (Timestamps extends true ? CreatedAlias : never)
    | TypeAlias,
    KeyAttributes
  >,
  // 🔨 TOIMPROVE: Use EntityTable to infer extra attributes
  Attribute extends Key = keyof Definitions | Aliases,
  Hidden extends Key = O.SelectKeys<Definitions, { hidden: true } | [any, any, { hidden: true }]>
> = {
  aliases: Aliases
  all: Attribute
  default: Default
  key: {
    partitionKey: {
      pure: PK
      mapped: PKMappedAttribute
      dependsOn: PKDependsOn
      all: PK | PKDependsOn | PKMappedAttribute
    }
    sortKey: {
      pure: SK
      mapped: SKMappedAttribute
      dependsOn: SKDependsOn
      all: SK | SKDependsOn | SKMappedAttribute
    }
    all: KeyAttributes
  }
  always: {
    all: AlwaysAttributes
    default: Extract<AlwaysAttributes, Default>
    input: Exclude<AlwaysAttributes, Default>
  }
  required: {
    all: RequiredAttributes
    default: Extract<RequiredAttributes, Default>
    input: Exclude<RequiredAttributes, Default>
  }
  optional: Exclude<Attribute, KeyAttributes | AlwaysAttributes | RequiredAttributes>
  shown: Exclude<Attribute, Hidden>
}

export type FromDynamoData<T extends DynamoDBTypes> = {
  string: string
  boolean: boolean
  number: number
  list: any[]
  map: any
  binary: any
  set: any[]
}[T]

export type InferItemAttributeValue<
  Definitions extends AttributeDefinitions,
  AttributeName extends keyof Definitions,
  Definition = Definitions[AttributeName]
> = {
  dynamoDbType: Definition extends DynamoDBTypes ? FromDynamoData<Definition> : never
  pure: Definition extends
    | PartitionKeyDefinition
    | GSIPartitionKeyDefinition
    | SortKeyDefinition
    | GSISortKeyDefinition
    | PureAttributeDefinition
    ? Definition['type'] extends DynamoDBTypes
      ? Definition['setType'] extends DynamoDBKeyTypes
       ? FromDynamoData<NonNullable<Definition['setType']>>[] : FromDynamoData<Cast<Definition['type'], DynamoDBTypes>>
      : any
    : never
  composite: Definition extends CompositeAttributeDefinition
    ? Definition[0] extends Exclude<keyof Definitions, AttributeName>
      ? InferItemAttributeValue<Definitions, Definition[0]>
      : any
    : never
}[Definition extends DynamoDBTypes
  ? 'dynamoDbType'
  : Definition extends
      | PartitionKeyDefinition
      | GSIPartitionKeyDefinition
      | SortKeyDefinition
      | GSISortKeyDefinition
      | PureAttributeDefinition
  ? 'pure'
  : Definition extends CompositeAttributeDefinition
  ? 'composite'
  : never]

export type InferItem<
  Definitions extends AttributeDefinitions,
  Attributes extends ParsedAttributes
> = O.Optional<
  {
    [K in Attributes['all']]: K extends keyof Definitions
      ? InferItemAttributeValue<Definitions, K>
      : K extends Attributes['aliases']
      ? string
      : never
  },
  Attributes['optional']
>

export type CompositePrimaryKeyPart<
  Item extends Dictionary,
  Attributes extends ParsedAttributes,
  KeyType extends 'partitionKey' | 'sortKey',
  KeyPureAttribute extends Key = Attributes['key'][KeyType]['pure'],
  KeyDependsOnAttributes extends Key = Attributes['key'][KeyType]['dependsOn'],
  KeyCompositeAttributes extends Key = Attributes['key'][KeyType]['mapped']
> = If<
  Equals<KeyPureAttribute, never>,
  Record<never, unknown>,
  O.Optional<
    | O.Pick<Item, KeyPureAttribute>
    | If<Equals<KeyDependsOnAttributes, never>, never, O.Pick<Item, KeyDependsOnAttributes>>
    | If<Equals<KeyCompositeAttributes, never>, never, O.Pick<Item, KeyCompositeAttributes>>,
    If<
      Equals<KeyDependsOnAttributes, never>,
      // If primary key part doesn't have "dependsOn" attribute, either it has "default" attribute and is optional,
      // either it doesn't and is required
      Attributes['default'],
      // If primary key part has "dependsOn" attribute, "default" should be a function using other attributes. We want
      // either: - O.Pick<Item, KeyDependsOnAttributes> which should not contain KeyPureAttribute - O.Pick<Item,
      // KeyPureAttribute> with KeyPureAttribute NOT optional this time
      Exclude<Attributes['default'], KeyPureAttribute>
    >
  >
>

export type InferCompositePrimaryKey<
  Item extends Dictionary,
  Attributes extends ParsedAttributes
> = Compute<
  CompositePrimaryKeyPart<Item, Attributes, 'partitionKey'> &
    CompositePrimaryKeyPart<Item, Attributes, 'sortKey'>
>

// Options

export type Overlay = undefined | Dictionary

export type ConditionOrFilter<Attributes extends Key = Key> = (
  | { attr: Attributes }
  | { size: string }
) &
  Partial<{
    contains: string
    exists: boolean
    type: 'S' | 'SS' | 'N' | 'NS' | 'B' | 'BS' | 'BOOL' | 'NULL' | 'L' | 'M'
    or: boolean
    negate: boolean
    entity: string
    // 🔨 TOIMPROVE: Probably typable
    eq: string | number | boolean | null
    ne: string | number | boolean | null
    lt: string | number
    lte: string | number
    gt: string | number
    gte: string | number
    between: [string, string] | [number, number]
    beginsWith: string
    in: any[]
  }>

export type ConditionsOrFilters<Attributes extends Key = Key> =
  | ConditionOrFilter<Attributes>
  | ConditionsOrFilters<Attributes>[]

export type BaseOptions<
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = {
  capacity: DocumentClient.ReturnConsumedCapacity
  execute: Execute
  parse: Parse
}

export type $ReadOptions<
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = BaseOptions<Execute, Parse> & {
  consistent: boolean
}

export type $GetOptions<
  Attributes extends Key = Key,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = Partial<$ReadOptions<Execute, Parse> & { attributes: Attributes[]; include: string[] }>

export type EntityQueryOptions<
  Attributes extends Key = Key,
  FiltersAttributes extends Key = Attributes,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = Partial<
  $QueryOptions<Execute, Parse> & {
    attributes: Attributes[]
    filters: ConditionsOrFilters<FiltersAttributes>
  }
>

export type $WriteOptions<
  Attributes extends Key = Key,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = BaseOptions<Execute, Parse> & {
  conditions: ConditionsOrFilters<Attributes>
  metrics: DocumentClient.ReturnItemCollectionMetrics
  include: string[]
}

export type PutOptionsReturnValues = 'NONE' | 'ALL_OLD'

export type $PutOptions<
  Attributes extends Key = Key,
  ReturnValues extends PutOptionsReturnValues = PutOptionsReturnValues,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined,
  StrictSchemaCheck extends boolean | undefined = true
> = Partial<
  $WriteOptions<Attributes, Execute, Parse> & {
    returnValues: ReturnValues
    strictSchemaCheck?: StrictSchemaCheck
  }
>

export type $PutBatchOptions<
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined,
  StrictSchemaCheck extends boolean | undefined = true
> = Partial<
  Pick<BaseOptions<Execute, Parse>, 'execute' | 'parse'> & { strictSchemaCheck?: StrictSchemaCheck }
>

export type PutItem<
  MethodItemOverlay extends Overlay,
  EntityItemOverlay extends Overlay,
  CompositePrimaryKey extends Dictionary,
  Item extends Dictionary,
  Attributes extends ParsedAttributes,
  StrictSchemaCheck extends boolean | undefined = true
> = FirstDefined<
  | [
      MethodItemOverlay,
      EntityItemOverlay,
      Compute<
        CompositePrimaryKey &
          O.Pick<Item, Attributes['always']['input'] | Attributes['required']['input']> &
          Partial<
            O.Pick<Item, Attributes['always']['default'] | Attributes['required']['default']> &
              O.Update<Item, Attributes['optional'], A.x | null>
          >
      >
    ]
  | If<Equals<StrictSchemaCheck, true>, never, any>
>

export type UpdateOptionsReturnValues =
  | 'NONE'
  | 'UPDATED_OLD'
  | 'UPDATED_NEW'
  | 'ALL_OLD'
  | 'ALL_NEW'

export type $UpdateOptions<
  Attributes extends Key = Key,
  ReturnValues extends UpdateOptionsReturnValues = UpdateOptionsReturnValues,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined,
  StrictSchemaCheck extends boolean | undefined = true
> = Partial<
  $WriteOptions<Attributes, Execute, Parse> & {
    returnValues: ReturnValues
    strictSchemaCheck?: StrictSchemaCheck
  }
>

export interface UpdateCustomParameters {
  SET: string[]
  REMOVE: string[]
  ADD: string[]
  DELETE: string[]
}

export type UpdateCustomParams = Partial<UpdateCustomParameters & DocumentClient.UpdateItemInput>

export type UpdateItem<MethodItemOverlay extends Overlay,
  EntityItemOverlay extends Overlay,
  CompositePrimaryKey extends Dictionary,
  Item extends Dictionary,
  Attributes extends ParsedAttributes,
  StrictSchemaCheck extends boolean | undefined = true> = FirstDefined<[
    MethodItemOverlay,
    EntityItemOverlay,
    Compute<CompositePrimaryKey &
      {
        [inputAttr in Attributes['always']['input'] & keyof Item]: AttributeUpdateInput<Item[inputAttr]>
      } &
      {
        [inputRequiredOrWithDefaultAttribute in (Attributes['required']['all'] | Attributes['always']['default']) & keyof Item]?: AttributeUpdateInput<Item[inputRequiredOrWithDefaultAttribute]>
      } &
      {
        [inputOptionalAttribute in Attributes['optional'] & keyof Item]?: AttributeUpdateInput<Item[inputOptionalAttribute]> | null
      } & { $remove?: Attributes['optional'] | Attributes['optional'][] }>
  ]
  | If<Equals<StrictSchemaCheck, true>, never, any>>

export type AttributeUpdateInput<AttributeType> =
    | If<Equals<AttributeType, FromDynamoData<'list' | 'set'> | undefined>, { $delete?: string[]; $add?: any; $prepend?: AttributeType; $append?: AttributeType; $remove?: number[] } | AttributeType, AttributeType>
    | If<Equals<AttributeType, number[] | undefined>, { $delete?: number[]; $add?: number[]; $prepend?: AttributeType; $append?: number[]; } | string[]>
    | If<Equals<AttributeType, string[] | undefined>, { $delete?: string[]; $add?: string[]; $prepend?: AttributeType; $append?: string[]; } | number[]>
    | If<Equals<AttributeType, boolean[] | undefined>, { $delete?: boolean[]; $add?: boolean[]; $prepend?: AttributeType; $append?: boolean[]; } | boolean[]>
    | If<Equals<AttributeType, FromDynamoData<'number'> | undefined>, { $add?: number }>


export type DeleteOptionsReturnValues = 'NONE' | 'ALL_OLD'

export type RawDeleteOptions<
  Attributes extends Key = Key,
  ReturnValues extends DeleteOptionsReturnValues = DeleteOptionsReturnValues,
  Execute extends boolean | undefined = undefined,
  Parse extends boolean | undefined = undefined
> = Partial<$WriteOptions<Attributes, Execute, Parse> & { returnValues: ReturnValues }>

export type TransactionOptionsReturnValues = 'NONE' | 'ALL_OLD'

export interface TransactionOptions<
  Attributes extends Key = Key,
  StrictSchemaCheck extends boolean | undefined = true
> {
  conditions?: ConditionsOrFilters<Attributes>
  returnValues?: TransactionOptionsReturnValues
  strictSchemaCheck?: StrictSchemaCheck
}

export type ShouldExecute<Execute extends boolean | undefined, AutoExecute extends boolean> = Or<
  Equals<Execute, true>,
  And<Equals<Execute, undefined>, Equals<AutoExecute, true>>
>

export type ShouldParse<Parse extends boolean | undefined, AutoParse extends boolean> = Or<
  Equals<Parse, true>,
  And<Equals<Parse, undefined>, Equals<AutoParse, true>>
>

export type Readonly<T> = T extends F.Function | undefined
  ? T
  : T extends Dictionary
  ? { readonly [P in keyof T]: Readonly<T[P]> }
  : T

export type Writable<T> = T extends F.Function | undefined
  ? T
  : T extends Dictionary
  ? { -readonly [P in keyof T]: Writable<T[P]> }
  : T

export type InferEntityItem<
  E extends Entity,
  WritableAttributeDefinitions extends AttributeDefinitions = Cast<
    O.Writable<E['attributes'], Key, 'deep'>,
    AttributeDefinitions
  >,
  Attributes extends ParsedAttributes = ParseAttributes<
    WritableAttributeDefinitions,
    E['timestamps'],
    E['createdAlias'],
    E['modifiedAlias'],
    E['typeAlias'],
    E['typeHidden']
  >,
  Item = InferItem<WritableAttributeDefinitions, Attributes>
> = Pick<Item, Extract<Attributes['shown'], keyof Item>>

export type EntityItem<E extends Entity> = E['_typesOnly']['_entityItemOverlay'] extends Record<
  Key,
  any
>
  ? E['_typesOnly']['_entityItemOverlay']
  : InferEntityItem<E>

export type ExtractAttributes<E extends Entity> =
  E['_typesOnly']['_entityItemOverlay'] extends Record<Key, any>
    ? ParsedAttributes<keyof E['_typesOnly']['_entityItemOverlay']>
    : ParseAttributes<
        Cast<O.Writable<E['attributes'], Key, 'deep'>, AttributeDefinitions>,
        E['timestamps'],
        E['createdAlias'],
        E['modifiedAlias'],
        E['typeAlias'],
        E['typeHidden']
      >

export type GetOptions<
  E extends Entity,
  A extends ParsedAttributes = ExtractAttributes<E>
> = $GetOptions<A['shown'], boolean | undefined, boolean | undefined>

export type QueryOptions<
  E extends Entity,
  A extends ParsedAttributes = ExtractAttributes<E>
> = EntityQueryOptions<A['shown'], A['all'], boolean | undefined, boolean | undefined>

export type PutOptions<
  E extends Entity,
  A extends ParsedAttributes = ExtractAttributes<E>
> = $PutOptions<
  A['all'],
  PutOptionsReturnValues,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined
>

export type DeleteOptions<
  E extends Entity,
  A extends ParsedAttributes = ExtractAttributes<E>
> = RawDeleteOptions<A['all'], DeleteOptionsReturnValues, boolean | undefined, boolean | undefined>

export type UpdateOptions<
  E extends Entity,
  A extends ParsedAttributes = ExtractAttributes<E>
> = $UpdateOptions<
  A['all'],
  UpdateOptionsReturnValues,
  boolean | undefined,
  boolean | undefined,
  boolean | undefined
>
