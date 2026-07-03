/**
 * Abstract base class for branded/typed domain identifiers.
 *
 * Each concrete subclass supplies its own string-literal `Brand`, which makes
 * instances of different identifier subclasses mutually non-assignable even
 * though they all wrap a plain string value at runtime. This prevents
 * accidental transposition of cross-aggregate identifiers (e.g. passing a
 * GoalId where a RoadmapId is expected) from type-checking silently.
 */
export abstract class Identifier<Brand extends string> {
  protected readonly value: string;

  // Phantom field: never assigned, exists purely to make TypeScript treat
  // Identifier<'Goal'> and Identifier<'Roadmap'> as structurally distinct.
  private readonly __brand!: Brand;

  protected constructor(value: string) {
    if (value === undefined || value === null || value.trim().length === 0) {
      throw new Error(`${new.target.name}: identifier value must be a non-empty string`);
    }
    this.value = value;
  }

  public equals(other: Identifier<Brand> | undefined | null): boolean {
    if (other === undefined || other === null) {
      return false;
    }
    if (!(other instanceof Identifier)) {
      return false;
    }
    return other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  public toJSON(): string {
    return this.value;
  }
}
