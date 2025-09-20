import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu"
import { 
  Plus, 
  Search, 
  Bell, 
  Calendar, 
  Settings, 
  Share2, 
  User, 
  LogOut, 
  CreditCard, 
  Users,
  Menu,
  Home,
  TrendingUp
} from "lucide-react"

export function Header() {
  return (
    <header className="bg-white/98 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 relative z-50 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section - Logo & Navigation */}
        <div className="flex items-center gap-8">
          {/* Enhanced Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">EventHub</h1>
              <p className="text-xs text-gray-500 font-medium">Professional Event Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" className="gap-2 text-gray-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="gap-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl font-medium">
              <Calendar className="h-4 w-4" />
              Events
            </Button>
            <Button variant="ghost" className="gap-2 text-gray-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl">
              <Users className="h-4 w-4" />
              Attendees
            </Button>
            <Button variant="ghost" className="gap-2 text-gray-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </Button>
          </nav>
        </div>

        {/* Center Section - Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search events, attendees, or organizers..." 
              className="pl-10 bg-white/80 border-gray-200 rounded-xl shadow-sm focus:shadow-md focus:border-purple-300 transition-all duration-200"
            />
          </div>
        </div>

        {/* Right Section - Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Enhanced Quick Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 px-6">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
            
            <Button size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="relative rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl border-gray-200 shadow-xl">
              <DropdownMenuLabel className="text-base font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-sm">New RSVP for "Dinner Potluck"</p>
                  <p className="text-xs text-gray-500 mt-1">Sarah Miller just confirmed attendance</p>
                  <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-sm">Event Published Successfully</p>
                  <p className="text-xs text-gray-500 mt-1">"Weekend BBQ Party" is now live</p>
                  <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-sm">Reminder: Event Starts Soon</p>
                  <p className="text-xs text-gray-500 mt-1">"Test Published Event" starts in 2 hours</p>
                  <p className="text-xs text-gray-400 mt-1">3 hours ago</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="Profile" />
                  <AvatarFallback className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-gray-200 shadow-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">John Doe</p>
                  <p className="text-xs text-gray-500">john.doe@example.com</p>
                  <Badge variant="secondary" className="w-fit mt-2 text-xs">
                    Pro Plan
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 hover:bg-gray-50 rounded-lg">
                <User className="h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 hover:bg-gray-50 rounded-lg">
                <CreditCard className="h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 hover:bg-gray-50 rounded-lg">
                <Settings className="h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg">
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Button size="sm" variant="outline" className="md:hidden rounded-xl border-gray-200 hover:bg-gray-50">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="lg:hidden mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search events..." 
            className="pl-10 bg-white/80 border-gray-200 rounded-xl shadow-sm"
          />
        </div>
      </div>
    </header>
  )
}