# Rename

A safe command-line renaming utility using JavaScript regular expressions.

Prevents renaming collisions and overwriting existing files.

No dependencies outside of Node.js [>=v6.5](http://node.green/).



```
 rename.js [OPTION]... EXPRESSION REPLACEMENT FILE...

 -h, --help              Show this help.
 -v, --verbose           Print extended information.
 -d, --dry-run           Don't modify any file.
 -C, --ignore-collisions Force rename on collision conflicts.
 -S, --skip-problematic  Continue renaming non-problematic files instead of stopping on errors.
```
