import { Header } from "./components/Header"
import { FilterSidebar } from "./components/FilterSidebar"
import { EventCard } from "./components/EventCard"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Badge } from "./components/ui/badge"
import { Search, Calendar, SlidersHorizontal, Users } from "lucide-react"

export default function App() {
  const events = [
    {
      id: 1,
      title: "Annual Tech Conference 2025",
      date: "Mon, 22 Sept 2025",
      time: "04:08 pm",
      location: "Downtown Convention Center",
      attendees: 245,
      isHost: true,
      isGuest: false,
      isActive: true,
      dietary: "Mixed",
      category: "Technology",
      status: "Confirmed"
    },
    {
      id: 2,
      title: "Networking Dinner & Awards",
      date: "Thu, 18 Sept 2025",
      time: "07:00 pm",
      location: "Grand Hotel Ballroom",
      attendees: 128,
      isHost: false,
      isGuest: true,
      isActive: true,
      dietary: "Veg",
      category: "Networking",
      status: "RSVP Required"
    },
    {
      id: 3,
      title: "Weekend Team Building Retreat",
      date: "Sat, 25 Sept 2025",
      time: "10:00 am",
      location: "Mountain View Resort",
      attendees: 85,
      isHost: true,
      isGuest: false,
      isActive: true,
      dietary: "Non-veg",
      category: "Corporate",
      status: "Planning"
    },
    {
      id: 4,
      title: "Product Launch Presentation",
      date: "Wed, 24 Sept 2025",
      time: "02:30 pm",
      location: "Virtual Event",
      attendees: 340,
      isHost: true,
      isGuest: false,
      isActive: true,
      dietary: "Mixed",
      category: "Business",
      status: "Live Streaming"
    }
  ]

  const eventStats = {
    totalEvents: 24,
    thisWeek: 8,
    attendees: 1250,
    revenue: 45600
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex flex-col relative overflow-hidden">
      {/* Sophisticated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      {/* Professional Header */}
      <Header />

      {/* Main Content Area - Unified Background */}
      <div className="flex flex-1 relative z-10 bg-gradient-to-b from-black/20 to-black/10 backdrop-blur-sm">
        {/* Sidebar */}
        <FilterSidebar />
        
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Stats Overview */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Event Dashboard</h1>
                <p className="text-white/70 text-base">Manage your professional events and grow your network</p>
              </div>
              
              <Button variant="outline" size="sm" className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm rounded-xl px-4 py-2 transition-all duration-200">
                <SlidersHorizontal className="h-4 w-4" />
                Hide Filters
              </Button>
            </div>

            {/* Event Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 rounded-full p-3">
                    <Calendar className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-medium">Total Events</p>
                    <p className="text-2xl font-bold text-white">{eventStats.totalEvents}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 rounded-full p-3">
                    <Calendar className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-medium">This Week</p>
                    <p className="text-2xl font-bold text-white">{eventStats.thisWeek}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 rounded-full p-3">
                    <Users className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-medium">Total Attendees</p>
                    <p className="text-2xl font-bold text-white">{eventStats.attendees.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 rounded-full p-3">
                    <Badge className="h-6 w-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-medium">Revenue</p>
                    <p className="text-2xl font-bold text-white">${eventStats.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Tabs */}
          <div className="px-8 pb-8 space-y-6 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Search events, attendees, venues, or categories..." 
                className="pl-12 py-4 text-lg bg-white/95 backdrop-blur-sm border-0 rounded-2xl shadow-xl shadow-black/20 focus:shadow-2xl focus:shadow-black/30 transition-all duration-300 placeholder:text-gray-500"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/20">
                  <TabsTrigger value="upcoming" className="rounded-xl px-8 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all duration-200">
                    Upcoming (4)
                  </TabsTrigger>
                  <TabsTrigger value="drafts" className="rounded-xl px-8 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all duration-200">
                    Drafts (2)
                  </TabsTrigger>
                  <TabsTrigger value="past" className="rounded-xl px-8 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all duration-200">
                    Past (18)
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="rounded-xl px-8 py-3 text-gray-600 hover:text-gray-900 font-semibold transition-all duration-200">
                    Deleted
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm rounded-xl transition-all duration-200">
                    Export Events
                  </Button>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg transition-all duration-200">
                    + Create Event
                  </Button>
                </div>
              </div>

              <TabsContent value="upcoming" className="space-y-6">
                <div className="grid gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} {...event} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="drafts">
                <div className="text-center py-24">
                  <div className="bg-white/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-white/40" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No draft events</h3>
                  <p className="text-white/60 text-base mb-6 max-w-md mx-auto">Start creating your next amazing event. Save as draft and publish when ready.</p>
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl">
                    Create New Event
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="past">
                <div className="text-center py-24">
                  <div className="bg-white/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-white/40" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Your event history</h3>
                  <p className="text-white/60 text-base mb-6 max-w-md mx-auto">You've successfully hosted 18 events with over 2,500 total attendees.</p>
                  <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl">
                    View Analytics
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="deleted">
                <div className="text-center py-24">
                  <div className="bg-white/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="h-10 w-10 text-white/40" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No deleted events</h3>
                  <p className="text-white/60 text-base max-w-md mx-auto">Deleted events are stored here for 30 days before permanent removal.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}