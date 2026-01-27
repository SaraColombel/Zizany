export abstract class ValueObject<T extends Record<string, any>> {
  props: T;
  constructor(props: T) {
    this.props = props;
  }
}
