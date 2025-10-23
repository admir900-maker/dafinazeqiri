'use client'

import { useState } from 'react'
import { Search, MapPin, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchBar() {
  const [location, setLocation] = useState('İSTANBUL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showTrendDropdown, setShowTrendDropdown] = useState(false)

  const locations = ['İSTANBUL', 'ANKARA', 'İZMİR', 'BURSA', 'ANTALYA']

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle search
    console.log('Search:', searchQuery)
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <MapPin className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-gray-900">{location}</span>
            </button>
            {showLocationDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setLocation(loc)
                      setShowLocationDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Etkinlik Count */}
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-bold">İstanbul Etkinlikleri</span>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
            >
              34 Etkinlik
            </Button>
          </div>

          {/* Trends Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTrendDropdown(!showTrendDropdown)}
              className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700">Trendler</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Input
                type="search"
                placeholder="Etkinlik veya Sanatçı"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-12 h-10 rounded-full border-2 border-orange-500 focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-8 w-8 p-0"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
