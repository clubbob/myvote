// src/utils/getCategoryDefaultImage.ts

interface Category {
  name: string
  slug: string
  imagePath: string
}

export function getCategoryDefaultImage(categoryName: string, categories: Category[]): string {
  const matched = categories.find((c) => c.name === categoryName)
  return matched?.imagePath || ''
}
