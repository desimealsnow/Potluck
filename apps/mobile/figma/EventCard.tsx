import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Calendar, MapPin, Users } from "lucide-react"

interface EventCardProps {
  title: string
  date: string
  time: string
  location?: string
  attendees: number
  isHost: boolean
  isGuest?: boolean
  isActive: boolean
  dietary: string
  category?: string
  status?: string
}

/**
 * Render an event card displaying event details and status.
 *
 * The EventCard component takes various props to display the title, date, time, location, attendees, and status of an event. It conditionally renders badges for host, guest, and active status, as well as dietary preferences. The layout includes a gradient overlay and responsive design elements to enhance user interaction.
 *
 * @param {Object} props - The properties for the EventCard component.
 * @param {string} props.title - The title of the event.
 * @param {string} props.date - The date of the event.
 * @param {string} props.time - The time of the event.
 * @param {string} props.location - The location of the event.
 * @param {number} props.attendees - The number of attendees registered for the event.
 * @param {boolean} props.isHost - Indicates if the user is the host of the event.
 * @param {boolean} props.isGuest - Indicates if the user is a guest of the event.
 * @param {boolean} props.isActive - Indicates if the event is currently active.
 * @param {string} props.dietary - The dietary preference for the event.
 * @param {string} props.category - The category of the event.
 * @param {string} props.status - The current status of the event.
 * @returns {JSX.Element} The rendered event card component.
 */
export function EventCard({ 
  title, 
  date, 
  time, 
  location, 
  attendees, 
  isHost, 
  isGuest, 
  isActive, 
  dietary,
  category,
  status 
}: EventCardProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-0 rounded-3xl p-8 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 hover:bg-white group hover:scale-[1.01] relative overflow-hidden border border-white/20">
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">{title}</h3>
              {category && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 rounded-full px-3 py-1 text-xs font-medium">
                  {category}
                </Badge>
              )}
            </div>
            {status && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'Confirmed' ? 'bg-green-500' :
                  status === 'Planning' ? 'bg-orange-500' :
                  status === 'RSVP Required' ? 'bg-blue-500' :
                  status === 'Live Streaming' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-600">{status}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {isHost && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 border-0 rounded-full px-3 py-1 shadow-lg">
                🎯 Host
              </Badge>
            )}
            {isGuest && (
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 border-0 rounded-full px-3 py-1 shadow-lg">
                👤 Guest
              </Badge>
            )}
            {isActive && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 border-0 rounded-full px-3 py-1 shadow-lg">
                ✨ Active
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="flex items-center gap-4 text-gray-600">
            <div className="bg-indigo-100 rounded-xl p-3">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{date}</p>
              <p className="text-sm text-gray-600">{time}</p>
            </div>
          </div>
          
          {location && (
            <div className="flex items-center gap-4 text-gray-600">
              <div className="bg-blue-100 rounded-xl p-3">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{location}</p>
                <p className="text-sm text-gray-600">Event venue</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-gray-600">
              <div className="bg-green-100 rounded-xl p-3">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{attendees} attendees</p>
                <p className="text-sm text-gray-600">Registered</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-700 rounded-full px-4 py-2 font-medium shadow-sm"
              >
                {dietary === 'Veg' && '🌱'} 
                {dietary === 'Non-veg' && '🍖'} 
                {dietary === 'Mixed' && '🍽️'} 
                {dietary}
              </Badge>
              
              <Button size="sm" variant="outline" className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all duration-200">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}