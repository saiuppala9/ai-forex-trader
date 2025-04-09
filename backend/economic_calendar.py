import aiohttp
import asyncio
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class EconomicCalendar:
    def __init__(self):
        self.sources = [
            'https://www.forexfactory.com/calendar',
            'https://www.investing.com/economic-calendar',
            'https://www.fxstreet.com/economic-calendar'
        ]
        self.cache = {
            'last_update': None,
            'data': []
        }
        self.cache_duration = timedelta(minutes=5)

    async def get_calendar_data(self) -> List[Dict]:
        """Get economic calendar data from multiple sources"""
        try:
            # Check cache first
            if (self.cache['last_update'] and 
                datetime.now() - self.cache['last_update'] < self.cache_duration):
                return self.cache['data']

            all_events = []
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            async with aiohttp.ClientSession() as session:
                for source in self.sources:
                    try:
                        async with session.get(source, headers=headers) as response:
                            if response.status == 200:
                                html = await response.text()
                                events = await self._parse_calendar_data(html, source)
                                all_events.extend(events)
                    except Exception as e:
                        logger.error(f"Error fetching from {source}: {str(e)}")
                        continue

            # Sort events by time
            all_events.sort(key=lambda x: x['time'])

            # Update cache
            self.cache['data'] = all_events
            self.cache['last_update'] = datetime.now()

            return all_events

        except Exception as e:
            logger.error(f"Error getting calendar data: {str(e)}")
            return []

    async def _parse_calendar_data(self, html: str, source: str) -> List[Dict]:
        """Parse economic calendar data based on the source"""
        events = []
        soup = BeautifulSoup(html, 'html.parser')

        try:
            if 'forexfactory' in source:
                events = await self._parse_forexfactory(soup)
            elif 'investing' in source:
                events = await self._parse_investing(soup)
            elif 'fxstreet' in source:
                events = await self._parse_fxstreet(soup)

        except Exception as e:
            logger.error(f"Error parsing {source}: {str(e)}")

        return events

    async def _parse_forexfactory(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse ForexFactory calendar data"""
        events = []
        try:
            calendar_rows = soup.find_all('tr', class_='calendar_row')
            current_date = None

            for row in calendar_rows:
                try:
                    # Get date
                    date_cell = row.find('td', class_='calendar__date')
                    if date_cell and date_cell.text.strip():
                        current_date = self._parse_date(date_cell.text.strip())

                    if not current_date:
                        continue

                    # Get time
                    time_cell = row.find('td', class_='calendar__time')
                    if not time_cell:
                        continue

                    time_str = time_cell.text.strip()
                    if not time_str or time_str == "All Day":
                        continue

                    # Parse event details
                    currency = row.find('td', class_='calendar__currency').text.strip()
                    impact = row.find('td', class_='calendar__impact')
                    impact_class = impact.find('span')['class'][0] if impact else ''
                    impact_level = self._get_impact_level(impact_class)

                    event = row.find('td', class_='calendar__event').text.strip()
                    actual = row.find('td', class_='calendar__actual').text.strip()
                    forecast = row.find('td', class_='calendar__forecast').text.strip()
                    previous = row.find('td', class_='calendar__previous').text.strip()

                    # Create event object
                    event_obj = {
                        'time': self._combine_datetime(current_date, time_str),
                        'currency': currency,
                        'event': event,
                        'impact': impact_level,
                        'actual': self._parse_value(actual),
                        'forecast': self._parse_value(forecast),
                        'previous': self._parse_value(previous)
                    }

                    events.append(event_obj)

                except Exception as e:
                    logger.error(f"Error parsing ForexFactory row: {str(e)}")
                    continue

        except Exception as e:
            logger.error(f"Error parsing ForexFactory calendar: {str(e)}")

        return events

    async def _parse_investing(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse Investing.com calendar data"""
        events = []
        try:
            event_rows = soup.find_all('tr', class_='js-event-item')

            for row in event_rows:
                try:
                    time = row.find('td', class_='time').text.strip()
                    currency = row.find('td', class_='left').text.strip()
                    event = row.find('td', class_='left event').text.strip()
                    impact = row.find('td', class_='left textIcon')['data-img_key']
                    actual = row.find('td', class_='bold').text.strip()
                    forecast = row.find('td', class_='fore').text.strip()
                    previous = row.find('td', class_='prev').text.strip()

                    event_obj = {
                        'time': self._parse_investing_time(time),
                        'currency': currency,
                        'event': event,
                        'impact': self._get_impact_level(impact),
                        'actual': self._parse_value(actual),
                        'forecast': self._parse_value(forecast),
                        'previous': self._parse_value(previous)
                    }

                    events.append(event_obj)

                except Exception as e:
                    logger.error(f"Error parsing Investing.com row: {str(e)}")
                    continue

        except Exception as e:
            logger.error(f"Error parsing Investing.com calendar: {str(e)}")

        return events

    async def _parse_fxstreet(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse FXStreet calendar data"""
        events = []
        try:
            event_rows = soup.find_all('tr', class_='calendar-row')

            for row in event_rows:
                try:
                    time = row.find('td', class_='time').text.strip()
                    currency = row.find('td', class_='currency').text.strip()
                    event = row.find('td', class_='event').text.strip()
                    impact = row.find('td', class_='impact').find('span')['class'][0]
                    actual = row.find('td', class_='actual').text.strip()
                    forecast = row.find('td', class_='forecast').text.strip()
                    previous = row.find('td', class_='previous').text.strip()

                    event_obj = {
                        'time': self._parse_fxstreet_time(time),
                        'currency': currency,
                        'event': event,
                        'impact': self._get_impact_level(impact),
                        'actual': self._parse_value(actual),
                        'forecast': self._parse_value(forecast),
                        'previous': self._parse_value(previous)
                    }

                    events.append(event_obj)

                except Exception as e:
                    logger.error(f"Error parsing FXStreet row: {str(e)}")
                    continue

        except Exception as e:
            logger.error(f"Error parsing FXStreet calendar: {str(e)}")

        return events

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string into datetime object"""
        try:
            return datetime.strptime(date_str, '%b %d, %Y')
        except:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except:
                return None

    def _combine_datetime(self, date: datetime, time_str: str) -> str:
        """Combine date and time into ISO format string"""
        try:
            time_parts = time_str.strip().split(':')
            if len(time_parts) == 2:
                hour, minute = map(int, time_parts)
                return datetime(
                    date.year, date.month, date.day,
                    hour, minute
                ).isoformat()
        except:
            pass
        return date.isoformat()

    def _get_impact_level(self, impact_class: str) -> str:
        """Convert impact class to standardized impact level"""
        impact_class = impact_class.lower()
        if 'high' in impact_class or 'bull3' in impact_class:
            return 'High'
        elif 'medium' in impact_class or 'bull2' in impact_class:
            return 'Medium'
        elif 'low' in impact_class or 'bull1' in impact_class:
            return 'Low'
        return 'Low'

    def _parse_value(self, value: str) -> Optional[float]:
        """Parse numeric value from string"""
        try:
            # Remove % and other symbols, convert to float
            value = re.sub(r'[^0-9.-]', '', value)
            return float(value) if value else None
        except:
            return None

    def _parse_investing_time(self, time_str: str) -> str:
        """Parse time from Investing.com format"""
        try:
            now = datetime.now()
            time_parts = time_str.strip().split(':')
            if len(time_parts) == 2:
                hour, minute = map(int, time_parts)
                return datetime(
                    now.year, now.month, now.day,
                    hour, minute
                ).isoformat()
        except:
            pass
        return datetime.now().isoformat()

    def _parse_fxstreet_time(self, time_str: str) -> str:
        """Parse time from FXStreet format"""
        try:
            now = datetime.now()
            time_parts = time_str.strip().split(':')
            if len(time_parts) == 2:
                hour, minute = map(int, time_parts)
                return datetime(
                    now.year, now.month, now.day,
                    hour, minute
                ).isoformat()
        except:
            pass
        return datetime.now().isoformat()

# Global instance
economic_calendar = EconomicCalendar()
