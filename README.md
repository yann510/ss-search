![npm](https://img.shields.io/npm/v/ss-search?style=flat-square)
![Travis (.org)](https://img.shields.io/travis/yann510/ss-search?style=flat-square)
![Coveralls github](https://img.shields.io/coveralls/github/yann510/ss-search?style=flat-square)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/ss-search?style=flat-square)

# s(imply)s(tupid)-search
### The most basic, yet powerful text search.
### Stop searching, start finding.

- Easy to use; will return you appropriate results out of the box, no need to configure anything
- Search local array of objects as easily as never before
- Automatic indexing
- Will return exactly what you are looking for
- Very small size; only depends on 4 lodash functions

## Demo

![](demo.gif)

If you're not convinced yet, take a look at this interactive
[demo](https://ss-search.netlify.app/). 

## Install
ss-search is available on [npm](https://www.npmjs.com/package/ss-search). It can be installed with the following command:

`npm install ss-search` 

## Usage

### Basic
```javascript
import { search } from "ss-search"

const data = [
     {
         number: 1,
         text: "A search function should be fast",
     },
     {
         number: 2,
         text: "A search function should provide accurate results"
     },
]
const searchKeys = ["text"] 
const searchText = "fast search"

const results = search(data, keys, searchText)
// results: [{ number: 2, text: "A search function should provide accurate results" }]
```

Yes. It is that simple, no need to configure anything, it works out of the box.

### Data Types

Almost all data types are supported [boolean, number, string, object, array].
```javascript
// This dataset will be used as a common starting point for our type examples
const data = [
    {
        boolean: true,
        number: 1,
        string: "search",
        object: { nestedProperty: "nested value" },
        array: ["value1", "value2"],
        arrayObjects: [{ arrayObjectProperty: "array object value" }],
    }
]
```

#### Boolean
```javascript
const results = search(data, ["boolean"], "true")
// results: will return our original dataset
```

#### Number
```javascript
const results = search(data, ["number"], "2")
// results: will return our original dataset
```

#### String
```javascript
const results = search(data, ["string"], "value")
// results: will return our original dataset
```

#### Object
```javascript
const results = search(data, ["object"], "property")
// results: will return our original dataset even though the searched text is not contained in the `nestedProperty` value, because our object will be transformed to a string with JSON.stringify

// If you want to access a nested property of an object:
const results = search(data, ["object.nestedProperty"], "property")
// results: will return an empty array as we extract the value of our nested object
```

#### Array
```javascript
const results = search(data, ["array"], "value2")
// results: will return our original dataset using JSON.stringify

// Array of objects
const results = search(data, ["arrayObjects[arrayObjectProperty]"], "value object")
// results: will return our original dataset as we extracted the specific value of the array objects using the array selector
```

### Benchmark

How does it compare to other search libraries? Test out for yourself with this interactive [benchmark](https://ss-search.netlify.app/benchmark) ;)
![](benchmark.gif)