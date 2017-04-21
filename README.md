# Rename [![npm](https://img.shields.io/npm/v/safe-rename-cli.svg)](https://www.npmjs.com/package/safe-rename-cli)

A simple and safe command-line renaming utility using JavaScript regular expressions.

Prevents renaming collisions and overwriting existing files. Check for collisions between input files *before* beginning to rename them.

No runtime dependencies outside of Node.js [>=v6.5](http://node.green/).

### Installation

```
$ npm install -g safe-rename-cli
```

### Usage examples

```sh
$ ls
foo.jsx   bar.jsx   bazjsx
$ rename '\.jsx' '.js' *
$ ls
foo.js bar.js bazjsx
```

```sh
$ ls
foobar   fooBAZbar   fooQUXbar
$ rename '([A-Z]+)bar$' 'bar-$1' *
$ ls
foobar  foobar-BAZ  foobar-QUX
```

```sh
$ ls
foo-10  foo-11  foo-9
$ rename 'foo-(.).*' '$1-foo.log' *
ERROR:  Colliding files:
   "foo-10.txt",
   "foo-11.txt"
=> "1-foo.log"
$ ls
foo-10  foo-11  foo-9
```

### Usage

```
 rename.js [OPTION]... EXPRESSION REPLACEMENT FILE...

 -h, --help              Show this help.
 -v, --verbose           Print extended information.
 -d, --dry-run           Don't modify any file.
 -C, --ignore-collisions Force rename on collision conflicts.
 -S, --skip-problematic  Continue renaming non-problematic files instead of stopping on errors.
```

### Notes

* For a more heavyweight solution with "undo" support try [jhotmann/rename-cli](https://www.npmjs.com/package/rename-cli).
