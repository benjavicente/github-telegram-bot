export class MessageBuilder {
  private msg: string = "";
  private addedSpaceBefore: boolean = true;

  add(text: string | boolean | undefined, { conditionalSpaces = true }: { conditionalSpaces?: boolean } = {}) {
    if (typeof text !== "string") return this;
    if (!this.addedSpaceBefore && conditionalSpaces) this.msg += " ";
    this.msg += text;
    this.addedSpaceBefore = text.at(-1) === " ";
    return this;
  }

  newLine(times: number = 1) {
    this.msg += "\n".repeat(times);
    this.addedSpaceBefore = true;
    return this;
  }

  build() {
    return this.msg;
  }
}
