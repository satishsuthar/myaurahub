import json
import os
import uuid
from datetime import datetime, timedelta, time
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ["TABLE_NAME"]
WORKSPACE_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
WORKSPACE_SLUG = "acme-coaching"
TZ = "Australia/Sydney"

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def response(status, body=None):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
            "access-control-allow-headers": "content-type,x-workspace-id,x-user-id",
        },
        "body": "" if body is None else json.dumps(body, default=json_default),
    }


def json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError


def handler(event, _context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return response(204)

    ensure_seed()
    method = event["requestContext"]["http"]["method"]
    path = event.get("rawPath", "/")
    query = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}")

    try:
        if path == "/health":
            return response(200, {"status": "ok", "mode": "serverless", "utc": datetime.utcnow().isoformat() + "Z"})
        if path == "/api/calendar/appointment-types" and method == "GET":
            return response(200, list_appointment_types())
        if path == "/api/calendar/appointment-types" and method == "POST":
            return response(201, create_appointment_type(body))
        if path.startswith("/api/calendar/appointment-types/") and method == "PUT":
            appointment_id = path.split("/")[4]
            return response(200, update_appointment_type(appointment_id, body))
        if path == "/api/calendar/bookings" and method == "GET":
            return response(200, list_bookings())
        if path == "/api/calendar/availability/me" and method == "GET":
            return response(200, get_availability(USER_ID))
        if path.startswith("/api/calendar/users/") and path.endswith("/availability") and method == "PUT":
            user_id = path.split("/")[4]
            return response(200, replace_availability(user_id, body))
        if path == "/api/calendar/unavailability" and method == "GET":
            return response(200, get_unavailability(USER_ID))
        if path == "/api/calendar/unavailability" and method == "PUT":
            return response(200, replace_unavailability(USER_ID, body))
        if path.startswith("/api/public/booking/"):
            return handle_public(method, path, query, body)
        return response(404, {"error": "Not found"})
    except ValueError as exc:
        return response(400, {"error": str(exc)})
    except ConflictError as exc:
        return response(409, {"error": str(exc)})


class ConflictError(Exception):
    pass


def workspace_pk():
    return f"WS#{WORKSPACE_SLUG}"


def appt_sk(slug):
    return f"APPT#{slug}"


def ensure_seed():
    existing = table.get_item(Key={"pk": workspace_pk(), "sk": "META"}).get("Item")
    if existing:
        return

    now = datetime.utcnow().isoformat() + "Z"
    table.put_item(Item={"pk": workspace_pk(), "sk": "META", "id": WORKSPACE_ID, "name": "Acme Coaching", "slug": WORKSPACE_SLUG, "timezone": TZ, "entity": "workspace", "createdAtUtc": now})
    table.put_item(Item={
        "pk": workspace_pk(), "sk": appt_sk("discovery-call"), "entity": "appointmentType",
        "id": "33333333-3333-3333-3333-333333333333", "workspaceId": WORKSPACE_ID, "assignedUserId": USER_ID,
        "name": "Discovery Call", "description": "A short introductory consultation.", "slug": "discovery-call",
        "durationMinutes": 30, "locationType": "Online", "locationValue": "Meeting link provided after booking",
        "bufferBeforeMinutes": 0, "bufferAfterMinutes": 15, "minimumNoticeMinutes": 120,
        "maximumBookingWindowDays": 30, "serviceIntervalMinutes": 15, "timezone": TZ, "isActive": True, "createdAtUtc": now,
    })
    for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
        table.put_item(Item={"pk": f"USER#{USER_ID}", "sk": f"AVAIL#{day}#09:00", "entity": "availability", "workspaceSlug": WORKSPACE_SLUG, "userId": USER_ID, "dayOfWeek": day, "startTime": "09:00", "endTime": "17:00", "timezone": TZ})


def list_appointment_types():
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk()) & Key("sk").begins_with("APPT#"))
    return [public_appt_shape(item) for item in result.get("Items", [])]


def create_appointment_type(data):
    slug = data["slug"].strip().lower()
    item = {
        "pk": workspace_pk(), "sk": appt_sk(slug), "entity": "appointmentType",
        "id": str(uuid.uuid4()), "workspaceId": WORKSPACE_ID, "assignedUserId": data.get("assignedUserId", USER_ID),
        "name": data["name"], "description": data.get("description"), "slug": slug,
        "durationMinutes": int(data.get("durationMinutes", 30)), "locationType": data.get("locationType", "Online"),
        "locationValue": data.get("locationValue"), "bufferBeforeMinutes": int(data.get("bufferBeforeMinutes", 0)),
        "bufferAfterMinutes": int(data.get("bufferAfterMinutes", 0)), "minimumNoticeMinutes": int(data.get("minimumNoticeMinutes", 0)),
        "maximumBookingWindowDays": int(data.get("maximumBookingWindowDays", 30)), "serviceIntervalMinutes": int(data.get("serviceIntervalMinutes", 15)),
        "timezone": data.get("timezone", TZ),
        "isActive": True, "createdAtUtc": datetime.utcnow().isoformat() + "Z",
    }
    table.put_item(Item=item)
    return public_appt_shape(item)


def update_appointment_type(appointment_id, data):
    current = find_appointment_by_id(appointment_id)
    if not current:
        raise ValueError("Appointment type not found.")
    old_key = {"pk": current["pk"], "sk": current["sk"]}
    slug = data.get("slug", current["slug"]).strip().lower()
    updated = {
        **current,
        "sk": appt_sk(slug),
        "name": data.get("name", current.get("name", "")),
        "description": data.get("description"),
        "slug": slug,
        "durationMinutes": int(data.get("durationMinutes", current.get("durationMinutes", 30))),
        "locationType": data.get("locationType", current.get("locationType", "Online")),
        "locationValue": data.get("locationValue"),
        "bufferBeforeMinutes": int(data.get("bufferBeforeMinutes", current.get("bufferBeforeMinutes", 0))),
        "bufferAfterMinutes": int(data.get("bufferAfterMinutes", current.get("bufferAfterMinutes", 0))),
        "minimumNoticeMinutes": int(data.get("minimumNoticeMinutes", current.get("minimumNoticeMinutes", 0))),
        "maximumBookingWindowDays": int(data.get("maximumBookingWindowDays", current.get("maximumBookingWindowDays", 30))),
        "serviceIntervalMinutes": int(data.get("serviceIntervalMinutes", current.get("serviceIntervalMinutes", 15))),
        "timezone": data.get("timezone", current.get("timezone", TZ)),
        "isActive": bool(data.get("isActive", current.get("isActive", True))),
        "updatedAtUtc": datetime.utcnow().isoformat() + "Z",
    }
    if old_key["sk"] != updated["sk"]:
        table.delete_item(Key=old_key)
    table.put_item(Item=updated)
    return public_appt_shape(updated)


def find_appointment_by_id(appointment_id):
    for item in table.query(KeyConditionExpression=Key("pk").eq(workspace_pk()) & Key("sk").begins_with("APPT#")).get("Items", []):
        if item.get("id") == appointment_id:
            return item
    return None


def public_appt_shape(item):
    shaped = {k: item.get(k) for k in ["id", "workspaceId", "assignedUserId", "name", "description", "slug", "durationMinutes", "locationType", "locationValue", "bufferBeforeMinutes", "bufferAfterMinutes", "minimumNoticeMinutes", "maximumBookingWindowDays", "serviceIntervalMinutes", "timezone", "isActive"]}
    shaped["serviceIntervalMinutes"] = int(shaped.get("serviceIntervalMinutes") or 15)
    return shaped


def get_appointment(slug):
    item = table.get_item(Key={"pk": workspace_pk(), "sk": appt_sk(slug)}).get("Item")
    if not item or not item.get("isActive", True):
        raise ValueError("Appointment type not found.")
    return item


def get_availability(user_id):
    result = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("AVAIL#"))
    return [{k: item.get(k) for k in ["dayOfWeek", "startTime", "endTime", "timezone"]} for item in result.get("Items", [])]


def replace_availability(user_id, data):
    existing = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("AVAIL#")).get("Items", [])
    with table.batch_writer() as batch:
        for item in existing:
            batch.delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
        for rule in data.get("rules", []):
            batch.put_item(Item={"pk": f"USER#{user_id}", "sk": f"AVAIL#{rule['dayOfWeek']}#{rule['startTime']}", "entity": "availability", "workspaceSlug": WORKSPACE_SLUG, "userId": user_id, "dayOfWeek": rule["dayOfWeek"], "startTime": rule["startTime"], "endTime": rule["endTime"], "timezone": data.get("timezone", TZ)})
    return get_availability(user_id)


def get_unavailability(user_id):
    result = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("UNAVAIL#"))
    return [{"date": item["date"], "reason": item.get("reason", "")} for item in result.get("Items", [])]


def replace_unavailability(user_id, data):
    existing = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("UNAVAIL#")).get("Items", [])
    with table.batch_writer() as batch:
        for item in existing:
            batch.delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
        for item in data.get("dates", []):
            date = item["date"]
            batch.put_item(Item={"pk": f"USER#{user_id}", "sk": f"UNAVAIL#{date}", "entity": "unavailability", "workspaceSlug": WORKSPACE_SLUG, "userId": user_id, "date": date, "reason": item.get("reason", "")})
    return get_unavailability(user_id)


def handle_public(method, path, query, body):
    parts = path.strip("/").split("/")
    if len(parts) < 4:
        return response(404, {"error": "Not found"})
    workspace_slug, appointment_slug = parts[3], parts[4] if len(parts) > 4 else ""
    if workspace_slug != WORKSPACE_SLUG:
        return response(404, {"error": "Workspace not found"})
    appt = get_appointment(appointment_slug)

    if len(parts) == 5 and method == "GET":
        return response(200, {"workspaceName": "Acme Coaching", "appointmentTypeName": appt["name"], "description": appt.get("description"), "durationMinutes": appt["durationMinutes"], "locationType": appt.get("locationType"), "locationValue": appt.get("locationValue"), "timezone": appt.get("timezone", TZ), "serviceIntervalMinutes": int(appt.get("serviceIntervalMinutes", 15))})
    if len(parts) == 6 and parts[5] == "slots" and method == "GET":
        return response(200, {"timezone": query.get("timezone", TZ), "slots": generate_slots(appt, query["from"], query["to"], query.get("timezone", TZ))})
    if len(parts) == 5 and method == "POST":
        return response(200, create_booking(appt, body))
    return response(404, {"error": "Not found"})


def generate_slots(appt, from_date, to_date, display_tz):
    zone = ZoneInfo(appt.get("timezone", TZ))
    start_date = datetime.fromisoformat(from_date).date()
    end_date = datetime.fromisoformat(to_date).date()
    now_utc = datetime.utcnow().replace(tzinfo=ZoneInfo("UTC"))
    min_bookable = now_utc + timedelta(minutes=int(appt.get("minimumNoticeMinutes", 0)))
    max_bookable = now_utc + timedelta(days=int(appt.get("maximumBookingWindowDays", 30)))
    rules = get_availability(appt["assignedUserId"])
    unavailable_dates = {item["date"] for item in get_unavailability(appt["assignedUserId"])}
    bookings = list_bookings()
    slots = []
    day = start_date
    while day <= end_date:
        weekday = day.strftime("%A")
        if day.isoformat() in unavailable_dates:
            day += timedelta(days=1)
            continue
        for rule in [r for r in rules if r["dayOfWeek"] == weekday]:
            local_start = datetime.combine(day, parse_time(rule["startTime"]), tzinfo=zone)
            local_end = datetime.combine(day, parse_time(rule["endTime"]), tzinfo=zone)
            cursor = local_start
            duration = int(appt["durationMinutes"])
            while cursor + timedelta(minutes=duration) <= local_end:
                slot_start = cursor.astimezone(ZoneInfo("UTC"))
                slot_end = slot_start + timedelta(minutes=duration)
                blocked_start = slot_start - timedelta(minutes=int(appt.get("bufferBeforeMinutes", 0)))
                blocked_end = slot_end + timedelta(minutes=int(appt.get("bufferAfterMinutes", 0)))
                if min_bookable <= slot_start <= max_bookable and not conflicts(bookings, blocked_start, blocked_end):
                    display = slot_start.astimezone(ZoneInfo(display_tz)).isoformat()
                    slots.append({"startUtc": slot_start.isoformat().replace("+00:00", "Z"), "endUtc": slot_end.isoformat().replace("+00:00", "Z"), "displayStart": display})
                cursor += timedelta(minutes=int(appt.get("serviceIntervalMinutes", 15)))
        day += timedelta(days=1)
    return slots


def conflicts(bookings, blocked_start, blocked_end):
    for booking in bookings:
        if booking["status"] != "Confirmed":
            continue
        existing_start = datetime.fromisoformat(booking["blockedStartUtc"].replace("Z", "+00:00"))
        existing_end = datetime.fromisoformat(booking["blockedEndUtc"].replace("Z", "+00:00"))
        if blocked_start < existing_end and existing_start < blocked_end:
            return True
    return False


def create_booking(appt, data):
    start = datetime.fromisoformat(data["startUtc"].replace("Z", "+00:00"))
    valid = any(slot["startUtc"] == data["startUtc"].replace("+00:00", "Z") for slot in generate_slots(appt, start.date().isoformat(), start.date().isoformat(), data.get("timezone", TZ)))
    if not valid:
        raise ConflictError("The selected slot is no longer available.")

    end = start + timedelta(minutes=int(appt["durationMinutes"]))
    blocked_start = start - timedelta(minutes=int(appt.get("bufferBeforeMinutes", 0)))
    blocked_end = end + timedelta(minutes=int(appt.get("bufferAfterMinutes", 0)))
    if conflicts(list_bookings(), blocked_start, blocked_end):
        raise ConflictError("The selected slot has just been booked.")

    booking_id = str(uuid.uuid4())
    email = data["email"].strip().lower()
    now = datetime.utcnow().isoformat() + "Z"
    table.put_item(Item={"pk": workspace_pk(), "sk": f"CONTACT#{email}", "entity": "contact", "id": str(uuid.uuid4()), "firstName": data.get("firstName", ""), "lastName": data.get("lastName", ""), "email": data["email"], "normalizedEmail": email, "phone": data.get("phone"), "timezone": data.get("timezone", TZ), "source": "CalendarBooking", "updatedAtUtc": now})
    table.put_item(Item={"pk": workspace_pk(), "sk": f"BOOKING#{booking_id}", "entity": "booking", "id": booking_id, "appointmentTypeId": appt["id"], "userId": appt["assignedUserId"], "status": "Confirmed", "startUtc": start.isoformat().replace("+00:00", "Z"), "endUtc": end.isoformat().replace("+00:00", "Z"), "blockedStartUtc": blocked_start.isoformat().replace("+00:00", "Z"), "blockedEndUtc": blocked_end.isoformat().replace("+00:00", "Z"), "customerName": f"{data.get('firstName','')} {data.get('lastName','')}".strip(), "customerEmail": data["email"], "customerPhone": data.get("phone"), "notes": data.get("notes"), "createdAtUtc": now})
    return {"bookingId": booking_id, "status": "Confirmed", "startUtc": start.isoformat().replace("+00:00", "Z"), "endUtc": end.isoformat().replace("+00:00", "Z")}


def list_bookings():
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk()) & Key("sk").begins_with("BOOKING#"))
    return [{k: item.get(k) for k in ["id", "appointmentTypeId", "userId", "status", "startUtc", "endUtc", "blockedStartUtc", "blockedEndUtc", "customerName", "customerEmail", "customerPhone", "notes"]} for item in result.get("Items", [])]


def parse_time(value):
    hour, minute = value.split(":")[:2]
    return time(int(hour), int(minute))
