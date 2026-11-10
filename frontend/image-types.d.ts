// Typer för bildimporter (t.ex. `import icon from "../icon.png"`).
// next-env.d.ts har samma referens men är gitignorerad och skapas först av `next build`/`next dev`,
// så `tsc --noEmit` i CI behöver den här filen.
/// <reference types="next/image-types/global" />
