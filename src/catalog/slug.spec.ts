import { createSlug } from './slug';

describe('createSlug', () => {
  it.each([
    ['Gaming Laptop', 'gaming-laptop'],
    ['Điện Thoại', 'dien-thoai'],
    ['  Home  &  Living  ', 'home-living'],
  ])('normalizes %s', (name, expected) => {
    expect(createSlug(name)).toBe(expected);
  });
});
