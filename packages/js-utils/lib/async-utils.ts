export async function asyncFilter<T>(array: T[], asyncPredicate: (x: T) => Promise<unknown>): Promise<T[]> {
  const results = await Promise.all(array.map(asyncPredicate))
  return array.filter((_, i) => results[i])
}
