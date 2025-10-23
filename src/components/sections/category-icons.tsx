'use client'

import Link from 'next/link'
import { Music, Theater } from 'lucide-react'

export function CategoryIcons() {
  const categories = [
    {
      name: 'Konser',
      icon: Music,
      href: '/categories/konser',
      color: 'bg-blue-500'
    },
    {
      name: 'Tiyatro',
      icon: Theater,
      href: '/categories/tiyatro',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center gap-8">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Link
                key={category.name}
                href={category.href}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center border-4 border-white shadow-lg transition-transform group-hover:scale-110`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-orange-500 group-hover:text-orange-600">
                  {category.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
