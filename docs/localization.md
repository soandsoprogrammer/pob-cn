# Chinese localization

`src/Localization.lua` installs a small rendering-time translation layer around
`DrawString` and `DrawStringWidth`. `src/LocalizationData.lua` contains the
generated English-to-Simplified-Chinese lookup table.

The translation data is generated from the CSV files in
[`Chuanhsing/PoeCharm`](https://github.com/Chuanhsing/PoeCharm), including the
Path of Building 2.66.2 / Path of Exile 3.29 ascendancy updates maintained in
[`soandsoprogrammer/PoeCharm`](https://github.com/soandsoprogrammer/PoeCharm/tree/fix/pob-2.66.2-ascendancy-translations).

To rebuild the lookup table:

```text
node tools/localization/build_translation_data.js <translate_cn-directory> src/LocalizationData.lua
```

To audit current ascendancy strings against one or more passive tree files:

```text
node tools/localization/audit_ascendancy_translations.js <translate_cn-directory> <tree-file> [...]
```

The current ascendancy audit covers all 591 unique names and stat lines found
in the normal and Ruthless 3.29 passive trees.
