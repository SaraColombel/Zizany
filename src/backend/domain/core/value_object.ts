/*
 * ValueObject représente un objet simple ne servant qu'a transporter de la data (valeur)
 * La valeur (props) qu'il transporte est par définition immuable et c'est lui qui va servir
 * à muter une entity ou envoyer des données vers le front (par exemple) en étant typesafe.
 * https://github.com/RomainLanz/romainlanz.com/blob/main/apps/romainlanz.com/app/core/domain/value_object.ts
 */

export abstract class ValueObject<T extends object> {
  protected readonly value: Readonly<T>;

  constructor(props: T) {
    this.value = Object.freeze({ ...props }) as Readonly<T>;
  }
  equal(vo?: ValueObject<T>): boolean {
    if (!vo) return false;
    if (this === vo) return true;
    return this.value === vo.value;
  }
}
