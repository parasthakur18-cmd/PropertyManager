import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, startOfDay, eachDayOfInterval } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Property } from "@shared/schema";

interface DateBlock {
  available: boolean;
  bedsAvailable?: number;
}

interface RoomCalendarData {
  roomId: number;
  roomNumber: string;
  roomName: string | null;
  roomCategory: string;
  totalBeds: number | null;
  dateBlocks: { [date: string]: DateBlock };
}

export default function RoomCalendar() {
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(addDays(today, 30));
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">("all");

  // Fetch properties for filter
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch calendar data
  const { data: calendarData = [], isLoading } = useQuery<RoomCalendarData[]>({
    queryKey: [
      "/api/calendar/availability",
      startDate.toISOString(),
      endDate.toISOString(),
      selectedPropertyId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(selectedPropertyId !== "all" && { propertyId: selectedPropertyId.toString() }),
      });
      const res = await fetch(`/api/calendar/availability?${params}`);
      if (!res.ok) throw new Error("Failed to fetch calendar data");
      return res.json();
    },
  });

  // Generate array of dates for the calendar
  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevious30Days = () => {
    setStartDate(addDays(startDate, -30));
    setEndDate(addDays(endDate, -30));
  };

  const handleNext30Days = () => {
    setStartDate(addDays(startDate, 30));
    setEndDate(addDays(endDate, 30));
  };

  return (
    <div className="p-6 space-y-6" data-testid="room-calendar-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Room Availability Calendar
            </h1>
            <p className="text-muted-foreground">
              Airbnb-style visual calendar showing room availability
            </p>
          </div>
        </div>
      </div>

      {/* Date Range & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Check-in Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Check-in Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    data-testid="button-select-checkin"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(startOfDay(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Check-out Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="button-select-checkout"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(startOfDay(date))}
                    disabled={(date) => date <= startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Property Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Property</label>
              <Select
                value={selectedPropertyId.toString()}
                onValueChange={(value) =>
                  setSelectedPropertyId(value === "all" ? "all" : parseInt(value))
                }
                data-testid="select-property-filter"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handlePrevious30Days}
              data-testid="button-previous-30-days"
            >
              ← Previous 30 Days
            </Button>
            <Button
              variant="outline"
              onClick={handleNext30Days}
              data-testid="button-next-30-days"
            >
              Next 30 Days →
            </Button>
            <Button
              onClick={() => {
                setStartDate(today);
                setEndDate(addDays(today, 30));
              }}
              data-testid="button-reset-dates"
            >
              Reset to Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")} ({dates.length} days)
            </CardTitle>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span>Partial (Dorms)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading calendar...
            </div>
          ) : calendarData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rooms found for selected property
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-background border p-2 text-left min-w-[150px] z-10 font-semibold">
                      Room
                    </th>
                    {dates.map((date) => (
                      <th
                        key={date.toISOString()}
                        className="border p-2 text-center min-w-[45px] text-xs"
                      >
                        <div className="font-semibold">{format(date, "d")}</div>
                        <div className="text-muted-foreground font-normal">
                          {format(date, "EEE")}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarData.map((room) => (
                    <tr key={room.roomId} data-testid={`row-room-${room.roomId}`}>
                      <td className="sticky left-0 bg-background border p-3 font-medium z-10">
                        <div className="font-semibold">{room.roomNumber}</div>
                        {room.roomName && (
                          <div className="text-sm text-muted-foreground">
                            {room.roomName}
                          </div>
                        )}
                        {room.roomCategory === "dormitory" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            🛏️ {room.totalBeds} beds
                          </div>
                        )}
                      </td>
                      {dates.map((date) => {
                        const dateKey = format(date, "yyyy-MM-dd");
                        const block = room.dateBlocks[dateKey];

                        if (!block) {
                          return (
                            <td key={dateKey} className="border p-1 bg-gray-200" />
                          );
                        }

                        if (room.roomCategory === "dormitory") {
                          const bedsAvail = block.bedsAvailable || 0;
                          const totalBeds = room.totalBeds || 6;
                          const percentAvailable = (bedsAvail / totalBeds) * 100;

                          return (
                            <td
                              key={dateKey}
                              className="border p-1 text-center cursor-help"
                              style={{
                                backgroundColor:
                                  percentAvailable >= 50
                                    ? "#22c55e"
                                    : percentAvailable > 0
                                    ? "#fb923c"
                                    : "#ef4444",
                              }}
                              title={`${bedsAvail}/${totalBeds} beds available`}
                              data-testid={`cell-${room.roomId}-${dateKey}`}
                            >
                              <span className="text-xs text-white font-bold">
                                {bedsAvail}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={dateKey}
                            className={`border p-1 cursor-help ${
                              block.available ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={block.available ? "Available" : "Booked"}
                            data-testid={`cell-${room.roomId}-${dateKey}`}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>How to use:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Green cells = Room available</li>
          <li>Red cells = Room booked</li>
          <li>
            <strong>Dormitory rooms:</strong> Number shows available beds
            <ul className="list-circle list-inside ml-6 mt-1">
              <li>Green = 50%+ beds available</li>
              <li>Orange = Some beds available</li>
              <li>Red = Fully booked</li>
            </ul>
          </li>
          <li>Hover over cells for details</li>
          <li>Scroll horizontally to see more dates</li>
        </ul>
      </div>
    </div>
  );
}
