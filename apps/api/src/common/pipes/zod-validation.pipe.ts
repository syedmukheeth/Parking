import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { DomainError } from '../errors/domain-error';

/**
 * Validates a body/query/param against a Zod schema from @parkap/shared and
 * throws the same VALIDATION_FAILED shape everywhere. Every inbound boundary
 * uses this - never a bare `fetch`-shaped assumption about request shape.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.reduce<Record<string, unknown>>((acc, issue) => {
        acc[issue.path.join('.') || '(root)'] = issue.message;
        return acc;
      }, {});
      throw new DomainError('VALIDATION_FAILED', 'Request failed validation', details);
    }
    return result.data;
  }
}
