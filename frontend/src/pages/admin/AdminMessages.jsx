import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { adminService } from "../../services/admin";
import Loading from "../../components/ui/Loading";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { MessageSquare, Users, Layers, Activity } from "lucide-react";

const chartColors = ["#667eea", "#764ba2", "#48bb78", "#ed8936", "#4299e1", "#3182ce"];
const sentimentColors = ["#48bb78", "#f56565", "#a0aec0"];

const AdminMessages = () => {
  const [loading, setLoading] = useState(true);
  const [messageStats, setMessageStats] = useState(null);
  const [botStats, setBotStats] = useState(null);
  const [error, setError] = useState(null);
  const [daysRange, setDaysRange] = useState(7);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [messageResponse, botResponse] = await Promise.all([
        adminService.getMessageStats({ days: daysRange }),
        adminService.getChatbotStats({ days: daysRange }),
      ]);

      if (messageResponse?.status === "success") {
        setMessageStats(messageResponse);
      } else {
        setMessageStats(null);
      }

      if (botResponse?.status === "success") {
        setBotStats(botResponse);
      } else {
        setBotStats(null);
      }
    } catch (error) {
      console.error("Error fetching message stats:", error);
      setError("Failed to load analytics data. Please try again.");
      setMessageStats(null);
      setBotStats(null);
    } finally {
      setLoading(false);
    }
  };

  const summary = messageStats?.summary;

  const dateRange = useMemo(() => {
    if (!summary?.start_date || !summary?.end_date) return [];
    const start = parseISO(summary.start_date);
    const end = parseISO(summary.end_date);
    if (start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [summary]);

  const dailySeries = useMemo(() => {
    if (!messageStats || dateRange.length === 0) return [];
    const dailyMap = new Map();
    (messageStats.daily || []).forEach((entry) => {
      dailyMap.set(entry.date, entry);
    });

    return dateRange.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      const entry = dailyMap.get(key);
      return {
        date: format(date, "dd/MM"),
        fullDate: key,
        messages: entry?.messages || 0,
        rooms: entry?.rooms || 0,
        users: entry?.users || 0,
      };
    });
  }, [messageStats, dateRange]);

  const roomBreakdown = useMemo(() => {
    if (!messageStats?.room_breakdown) return [];
    return [...messageStats.room_breakdown].sort((a, b) => b.messages - a.messages);
  }, [messageStats]);

  const topRooms = useMemo(() => roomBreakdown.slice(0, 5), [roomBreakdown]);

  const roomDailyLookup = useMemo(() => {
    const lookup = new Map();
    (messageStats?.room_daily || []).forEach((entry) => {
      lookup.set(`${entry.room_id}-${entry.date}`, entry);
    });
    return lookup;
  }, [messageStats]);

  const roomUsersSeries = useMemo(() => {
    if (dateRange.length === 0 || topRooms.length === 0) return [];
    return dateRange.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      const row = { date: format(date, "dd/MM") };
      topRooms.forEach((room) => {
        const label = room.room_name || `Room #${room.room_id}`;
        const entry = roomDailyLookup.get(`${room.room_id}-${key}`);
        row[label] = entry?.users || 0;
      });
      return row;
    });
  }, [dateRange, topRooms, roomDailyLookup]);

  const topRoomLabels = useMemo(
    () => topRooms.map((room) => room.room_name || `Room #${room.room_id}`),
    [topRooms]
  );

  const botSummary = botStats?.summary;

  const sentimentBreakdown = useMemo(() => {
    if (!botSummary) return [];
    const breakdown = [
      { name: "Positive", value: botSummary.positive_count || 0 },
      { name: "Negative", value: botSummary.negative_count || 0 },
    ];
    if (botSummary.neutral_count) {
      breakdown.push({ name: "Neutral", value: botSummary.neutral_count });
    }
    return breakdown.filter((item) => item.value > 0);
  }, [botSummary]);

  const botDailySeries = useMemo(() => {
    if (!botStats?.daily) return [];
    return botStats.daily.map((entry) => ({
      date: format(parseISO(entry.date), "dd/MM"),
      positive: entry.positive || 0,
      negative: entry.negative || 0,
      neutral: entry.neutral || 0,
      total: entry.total || 0,
    }));
  }, [botStats]);

  const hasDailyData = dailySeries.some(
    (item) => item.messages > 0 || item.rooms > 0 || item.users > 0
  );

  const hasRoomData = roomUsersSeries.some((item) =>
    topRoomLabels.some((label) => (item[label] || 0) > 0)
  );

  const hasSentimentData = sentimentBreakdown.length > 0;
  const hasBotDailyData = botDailySeries.some(
    (entry) => entry.positive > 0 || entry.negative > 0 || entry.neutral > 0
  );

  const averageMessages = summary ? Number(summary.avg_messages_per_room || 0).toFixed(1) : "0.0";
  const feedbackTotal = botSummary?.feedback_total || 0;
  const positiveRate = botSummary
    ? Number(((botSummary.positive_ratio || 0) * 100).toFixed(1))
    : 0;
  const negativeRate = botSummary
    ? Number(((botSummary.negative_ratio || 0) * 100).toFixed(1))
    : 0;
  const showNeutralInDaily = botDailySeries.some((entry) => entry.neutral > 0);

  const handleDaysChange = (event) => {
    const value = Number(event.target.value);
    setDaysRange(value);
  };

  if (loading && !messageStats && !botStats) {
    return (
      <PageContainer>
        <Loading />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>💬 Message Management</h1>
        <p>Monitor chat activity across rooms with daily insights</p>
      </PageHeader>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <ControlsBar>
        <ControlsLabel>Time range:</ControlsLabel>
        <ControlsSelect value={daysRange} onChange={handleDaysChange}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </ControlsSelect>
        <RangeInfo>
          {summary?.start_date && summary?.end_date ? (
            <>
              <span>{format(parseISO(summary.start_date), "dd/MM/yyyy")}</span>
              <span>→</span>
              <span>{format(parseISO(summary.end_date), "dd/MM/yyyy")}</span>
            </>
          ) : null}
        </RangeInfo>
      </ControlsBar>

      <SummaryGrid>
        <SummaryCard>
          <IconWrapper $variant="rooms">
            <Layers size={28} />
          </IconWrapper>
          <CardContent>
            <CardLabel>Active rooms</CardLabel>
            <CardValue>{summary?.total_rooms ?? 0}</CardValue>
            <CardSubtext>With at least one message</CardSubtext>
          </CardContent>
        </SummaryCard>
        <SummaryCard>
          <IconWrapper $variant="messages">
            <MessageSquare size={28} />
          </IconWrapper>
          <CardContent>
            <CardLabel>Total messages</CardLabel>
            <CardValue>{summary?.total_messages ?? 0}</CardValue>
            <CardSubtext>{summary?.days ?? daysRange} day total</CardSubtext>
          </CardContent>
        </SummaryCard>
        <SummaryCard>
          <IconWrapper $variant="users">
            <Users size={28} />
          </IconWrapper>
          <CardContent>
            <CardLabel>Unique senders</CardLabel>
            <CardValue>{summary?.total_users ?? 0}</CardValue>
            <CardSubtext>Distinct users posting messages</CardSubtext>
          </CardContent>
        </SummaryCard>
        <SummaryCard>
          <IconWrapper $variant="activity">
            <Activity size={28} />
          </IconWrapper>
          <CardContent>
            <CardLabel>Avg. messages / room</CardLabel>
            <CardValue>{averageMessages}</CardValue>
            <CardSubtext>Across active rooms</CardSubtext>
          </CardContent>
        </SummaryCard>
        {botSummary && (
          <SummaryCard>
            <IconWrapper $variant="bot-total">
              <MessageSquare size={28} />
            </IconWrapper>
            <CardContent>
              <CardLabel>Bot conversations</CardLabel>
              <CardValue>{botSummary.total_conversations ?? 0}</CardValue>
              <CardSubtext>
                {feedbackTotal} rated feedback
              </CardSubtext>
            </CardContent>
          </SummaryCard>
        )}
        {botSummary && (
          <SummaryCard>
            <IconWrapper $variant="bot-positive">
              <Activity size={28} />
            </IconWrapper>
            <CardContent>
              <CardLabel>Positive feedback</CardLabel>
              <CardValue>{positiveRate}%</CardValue>
              <CardSubtext>
                {botSummary.positive_count || 0} positive • {botSummary.negative_count || 0} negative
              </CardSubtext>
            </CardContent>
          </SummaryCard>
        )}
      </SummaryGrid>

      <ChartsGrid>
        <ChartCard>
          <ChartHeader>
            <div>
              <ChartTitle>Daily activity overview</ChartTitle>
              <ChartSubtitle>Messages, active rooms, and unique users per day</ChartSubtitle>
            </div>
          </ChartHeader>
          <ChartBody>
            {hasDailyData ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    name="Messages"
                    stroke="#667eea"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rooms"
                    name="Active rooms"
                    stroke="#48bb78"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Unique users"
                    stroke="#ed8936"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState>No activity recorded in this range.</EmptyChartState>
            )}
          </ChartBody>
        </ChartCard>

        <ChartCard>
          <ChartHeader>
            <div>
              <ChartTitle>Unique users per room (daily)</ChartTitle>
              <ChartSubtitle>Top active rooms stacked by unique users each day</ChartSubtitle>
            </div>
            {topRoomLabels.length > 0 && (
              <Badge>{topRoomLabels.length} rooms</Badge>
            )}
          </ChartHeader>
          <ChartBody>
            {topRoomLabels.length > 0 && hasRoomData ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={roomUsersSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {topRoomLabels.map((label, index) => (
                    <Bar
                      key={label}
                      dataKey={label}
                      stackId="rooms"
                      fill={chartColors[index % chartColors.length]}
                      name={label}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState>
                Not enough room activity to display a breakdown.
              </EmptyChartState>
            )}
          </ChartBody>
        </ChartCard>
      </ChartsGrid>

      <RoomsCard>
        <ChartHeader>
          <div>
            <ChartTitle>Most active rooms</ChartTitle>
            <ChartSubtitle>Total messages and unique users during the selected range</ChartSubtitle>
          </div>
        </ChartHeader>

        {roomBreakdown.length > 0 ? (
          <RoomList>
            {roomBreakdown.map((room, index) => (
              <RoomRow key={room.room_id}>
                <RoomRank>{index + 1}</RoomRank>
                <RoomInfo>
                  <RoomName>{room.room_name || `Room #${room.room_id}`}</RoomName>
                  <RoomMeta>
                    <span>{room.messages} messages</span>
                    <Divider>•</Divider>
                    <span>{room.users} users</span>
                    {room.last_active && (
                      <>
                        <Divider>•</Divider>
                        <span>
                          Last active{" "}
                          {format(parseISO(room.last_active), "dd/MM/yyyy HH:mm")}
                        </span>
                      </>
                    )}
                  </RoomMeta>
                </RoomInfo>
              </RoomRow>
            ))}
          </RoomList>
        ) : (
          <EmptyChartState>No room data available.</EmptyChartState>
        )}
      </RoomsCard>

 
    </PageContainer>
  );
};

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1f36;
  }

  p {
    color: #4a5568;
  }
`;

const ErrorBanner = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(245, 101, 101, 0.3);
  background: rgba(245, 101, 101, 0.12);
  color: #9b2c2c;
  font-weight: 500;
`;

const ControlsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.15);
  border-radius: 12px;
  padding: 1rem 1.5rem;
`;

const ControlsLabel = styled.span`
  font-weight: 600;
  color: #2d3748;
`;

const ControlsSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgb(141, 187, 236);
  background: white;
  cursor: pointer;
  font-weight: 500;
  color: #1a202c;
`;

const RangeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4a5568;
  font-size: 0.9rem;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const SummaryCard = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "rooms":
        return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      case "messages":
        return "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
      case "users":
        return "linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)";
      case "bot-total":
        return "linear-gradient(135deg, #805ad5 0%, #6b46c1 100%)";
      case "bot-positive":
        return "linear-gradient(135deg, #38b2ac 0%, #319795 100%)";
      case "activity":
      default:
        return "linear-gradient(135deg, #4299e1 0%, #3182ce 100%)";
    }
  }};
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const CardLabel = styled.span`
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 600;
`;

const CardValue = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a1f36;
`;

const CardSubtext = styled.span`
  font-size: 0.85rem;
  color: #718096;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const ChartCard = styled.div`
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 12px 40px rgba(79, 209, 197, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1f36;
`;

const ChartSubtitle = styled.p`
  font-size: 0.9rem;
  color: #718096;
  margin-top: 0.25rem;
`;

const ChartBody = styled.div`
  width: 100%;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PieWrapper = styled.div`
  width: 100%;
  max-width: 420px;
  height: 320px;
  margin: 0 auto;
`;

const Badge = styled.span`
  padding: 0.35rem 0.75rem;
  background: rgba(102, 126, 234, 0.15);
  color: #4c51bf;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const RoomsCard = styled(ChartCard)`
  padding-bottom: 1rem;
`;

const RoomList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  margin: 2rem 0 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a1f36;
`;

const SectionSubtitle = styled.p`
  margin-top: 0.25rem;
  color: #4a5568;
  font-size: 0.95rem;
  max-width: 720px;
`;

const BotChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
`;

const RoomRow = styled.div`
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  padding-bottom: 1rem;

  &:last-child {
    border-bottom: none;
  }
`;

const RoomRank = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.12);
  color: #4c51bf;
  font-weight: 700;
`;

const RoomInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const RoomName = styled.span`
  font-weight: 600;
  color: #1a1f36;
  font-size: 1rem;
`;

const RoomMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #4a5568;
`;

const Divider = styled.span`
  color: #cbd5f5;
`;

const SentimentStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const StatPill = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "positive":
        return "rgba(72, 187, 120, 0.18)";
      case "negative":
        return "rgba(245, 101, 101, 0.2)";
      case "neutral":
      default:
        return "rgba(160, 174, 192, 0.25)";
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case "positive":
        return "#276749";
      case "negative":
        return "#C53030";
      case "neutral":
      default:
        return "#4a5568";
    }
  }};
`;

const EmptyState = styled.div`
  background: white;
  border-radius: 16px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #718096;
  border: 1px solid rgba(226, 232, 240, 0.8);

  svg {
    color: #a0aec0;
  }
`;

const EmptyChartState = styled.div`
  color: #a0aec0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 500;
`;

export default AdminMessages;

