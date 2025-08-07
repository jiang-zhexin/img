import {
  object,
  number,
  optional,
  pipe,
  string,
  transform,
  minValue,
  literal,
  union,
} from "valibot";

export const ImageTransform = object({
  width: optional(pipe(string(), transform(parseInt), number())),
});
