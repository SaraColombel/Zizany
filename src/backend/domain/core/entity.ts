/*
 * Entity représente une entité métier de l'application et sera donc un genre de
 * ValueObject mais mutable (readonly props à retirer ?) et que l'on force ici à
 * avoir au minimum une props id qui sera un nombre.
 * https://github.com/RomainLanz/romainlanz.com/blob/main/apps/romainlanz.com/app/core/domain/entity.ts
 */

export abstract class Entity<TProperties extends { id: number }> {
  readonly props: TProperties;
  constructor(props: TProperties) {
    this.props = props;
  }

  equals(object: Entity<TProperties>) {
    if (this === object) return true;
    return this.props.id === object.props.id || false;
  }
}
