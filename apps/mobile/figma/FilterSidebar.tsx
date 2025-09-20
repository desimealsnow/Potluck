import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import { ChevronDown, MapPin } from "lucide-react"
import { useState } from "react"

export function FilterSidebar() {
  const [showExpanded, setShowExpanded] = useState(true)
  const [locationExpanded, setLocationExpanded] = useState(true)
  const [dietExpanded, setDietExpanded] = useState(true)
  const [categoryExpanded, setCategoryExpanded] = useState(true)

  return (
    <div className="w-80 bg-black/20 backdrop-blur-xl p-8 h-full relative border-r border-white/10">
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5"></div>
      
      <div className="relative z-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Smart Filters</h2>
          <p className="text-white/60 text-sm">Customize your event discovery</p>
        </div>
        
        <div className="space-y-6">
          {/* Show Section */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setShowExpanded(!showExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-bold text-white mb-4 hover:text-indigo-300 transition-colors"
            >
              EVENT SCOPE
              <ChevronDown className={`h-5 w-5 transition-transform ${showExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {showExpanded && (
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-0 rounded-full px-4 py-2 shadow-lg">
                  All Events
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-full px-4 py-2 backdrop-blur-sm transition-all duration-200">
                  My Events
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-full px-4 py-2 backdrop-blur-sm transition-all duration-200">
                  Invited
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-full px-4 py-2 backdrop-blur-sm transition-all duration-200">
                  Following
                </Badge>
              </div>
            )}
          </div>

          {/* Category Section */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setCategoryExpanded(!categoryExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-bold text-white mb-4 hover:text-indigo-300 transition-colors"
            >
              CATEGORIES
              <ChevronDown className={`h-5 w-5 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {categoryExpanded && (
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  💼 Business
                </Badge>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🤝 Networking
                </Badge>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  💻 Technology
                </Badge>
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🏢 Corporate
                </Badge>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setLocationExpanded(!locationExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-bold text-white mb-4 hover:text-indigo-300 transition-colors"
            >
              LOCATION
              <ChevronDown className={`h-5 w-5 transition-transform ${locationExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {locationExpanded && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <Badge className="bg-white/20 text-white border border-white/30 rounded-full px-3 py-1 backdrop-blur-sm text-sm">
                      📍 Nearby (25km)
                    </Badge>
                    <p className="text-white/60 text-xs mt-1">San Francisco, CA</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-full px-3 py-1 backdrop-blur-sm text-xs transition-all duration-200">
                    🌐 Virtual
                  </Badge>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-full px-3 py-1 backdrop-blur-sm text-xs transition-all duration-200">
                    🏙️ Downtown
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Diet Section */}
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setDietExpanded(!dietExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-bold text-white mb-4 hover:text-indigo-300 transition-colors"
            >
              DIETARY PREFERENCES
              <ChevronDown className={`h-5 w-5 transition-transform ${dietExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {dietExpanded && (
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🌱 Vegetarian
                </Badge>
                <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🍖 Non-vegetarian
                </Badge>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🍽️ Mixed Options
                </Badge>
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 border-0 rounded-full px-4 py-2 shadow-lg transition-all duration-200">
                  🌾 Gluten-Free
                </Badge>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/5">
            <h3 className="text-sm font-bold text-white mb-4">QUICK STATS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Active Events</span>
                <span className="text-white font-semibold">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">This Month</span>
                <span className="text-white font-semibold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Total Attendees</span>
                <span className="text-white font-semibold">1.2K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}