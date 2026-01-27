export abstract class Entity<TProperties extends { id: number }> {
  readonly props: TProperties;
  constructor(props: TProperties) {
    this.props = props;
  }

  equals(object: Entity<TProperties>) {
    return this === object;
  }
}
