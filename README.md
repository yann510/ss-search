![npm](https://img.shields.io/npm/v/ss-search?style=flat-square)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/ss-search?style=flat-square)
![build](https://github.com/yann510/ss-search/actions/workflows/publish-package.yml/badge.svg)
![Coveralls github](https://img.shields.io/coveralls/github/yann510/ss-search?style=flat-square)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](http://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

# s(imply)s(tupid)-search

### The most basic, yet powerful text search.

### Stop searching, start finding.

- **Ease of Use**: Get appropriate results instantly without any configuration.
- **Local Array Search**: Effortlessly search through a local array of objects.
- **Automatic Indexing**: No manual indexing required.
- **Precision**: Always get exactly what you're looking for.
- **Lightweight**: Depends on just 5 lodash functions for a minimized size after tree shaking.

## Demo

![](demo.gif)

Still not convinced? Experience its power firsthand with this interactive [demo](https://ss-search.netlify.app/).

### Benchmark

How does it compare to other search libraries? Test out for yourself with this interactive [benchmark](https://ss-search.netlify.app/benchmark) ;)

## Install

ss-search is available on [npm](https://www.npmjs.com/package/ss-search). Install it with:

`npm install ss-search`

## Usage

### Basic

```javascript
import { search } from 'ss-search'

const data = [
  {
    number: 1,
    text: 'A search function should be fast',
  },
  {
    number: 2,
    text: 'A search function should provide accurate results',
  },
]
const searchKeys = ['text']
const searchText = 'fast search'

const results = search(data, searchKeys, searchText)
// results: [{ number: 1, text: "A search function should be fast" }]
```

It's that straightforward. No configurations, it just works.

### Data Types

Almost all data types are supported [boolean, number, string, object, array].

```javascript
// This dataset will be used as a common starting point for our type examples
const data = [
  {
    boolean: true,
    number: 1,
    string: 'search',
    object: { nestedProperty: 'nested value' },
    array: ['value1', 'value2'],
    arrayObjects: [{ arrayObjectProperty: 'array object value' }],
  },
]
```

#### Boolean

```javascript
const results = search(data, ['boolean'], 'true')
// results: will return our original dataset
```

#### Number

```javascript
const results = search(data, ['number'], '1')
// results: will return our original dataset
```

#### String

```javascript
const results = search(data, ['string'], 'search')
// results: will return our original dataset
```

#### Object

Providing a key which refers to an object will stringify that object using JSON.stringify

```javascript
const results = search(data, ['object'], 'property')
// results: will return our original dataset as it matches the property key "nestedProperty" of our object
```

If you want to access a nested property of an object to extract only a single value

```javascript
const results = search(data, ['object.nestedProperty'], 'property')
// results: will return an empty array as we extracted the value of our nested object
// if we had searched for "nested value" we would of had the original dataset
```

#### Array

Providing a key which refers to an array will stringify that array using JSON.stringify

```javascript
const results = search(data, ['array'], 'value2')
// results: will return our original dataset
```

If you have an array of objects on which you want to search all properties

```javascript
const results = search(data, ['arrayObjects'], 'arrayObjectProperty')
// results: will return an our original dataset as it's treated just like a regular array
// thus the arrayObjectProperty is part of the searchable text
```

If you have an array of objects where you want only specific properties to be searchable

```javascript
const results = search(data, ['arrayObjects[arrayObjectProperty]'], 'arrayObjectProperty')
// results: will return an empty array as we extracted the value of our nested array of objects
// if we had searched for "value object" we would of had the original dataset
```

### Options for the `search` function

Customize your search experience using the following options:

| Option parameter | Value     | Description                                                                                                                                                                                                                                                                                                                   |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withScore`      | `true`    | When set to `true`, the search function will return an array of objects, each containing the matched element and its corresponding score. The score represents how closely the element matches the search text, with a higher score indicating a closer match. Even if the search doesn't match, it will return a score of 0. |
| `withScore`      | `false`   | When set to `false` or not provided, the function will return an array of matched elements without their scores.                                                                                                                                                                                                              |
| `cacheKey`       | `unknown` | The cacheKey is required if you dynamically update the `searchableKeys` as the memoization function will use the elements array by default to memoize the search tokens.                                                                                                                                                      |

### Example Usage

Without `withScore` option:

```javascript
const data = [{ name: 'John' }, { name: 'Jane' }, { name: 'Doe' }]
const result = search(data, ['name'], 'John')
console.log(result) // [{ name: 'John' }]
```

With `withScore` option:

```javascript
const data = [{ name: 'John' }, { name: 'Jane' }, { name: 'Doe' }]
const result = search(data, ['name'], 'John', { withScore: true })
console.log(result)
// [
//  { element: { name: 'John' }, score: 1 },
//  { element: { name: 'Jane' }, score: 0 },
//  { element: { name: 'Doe' }, score: 0 }
// ]
```

When updating the `searchableKeys` dynamically, you need to provide a `cacheKey`:

```javascript
const data = [
  { name: 'John', age: 50 },
  { name: 'Jane', age: 40 },
]
const result1 = search(data, ['name'], 'John', { cacheKey: 'name' })
const result2 = search(data, ['age'], 40, { cacheKey: 'age' })
// result1: [{ name: 'John', age: 50 }]
// result2: [{ name: 'Jane', age: 40 }]

// If you do not manually update the cache-key, your second search would have used "name" as the `searchKeys` and returned an empty array
```

![](benchmark.gif)

### Developing

To better manage dependencies across the monorepo I'm using [NX](https://nx.dev/).

Install dependencies:
`npm i`

Start the web-app:
`npm run web-app:serve`

Test the library:
`npm run test:all`
