export class MessageBuilder {
  private msg: string = "";

  add(text: string | boolean | undefined) {
    if (typeof text !== "string") return this;

    this.msg += text;
    return this;
  }

  newLine(times: number = 1) {
    this.msg += "\n".repeat(times);
    return this;
  }

  build() {
    return this.msg;
  }
}
