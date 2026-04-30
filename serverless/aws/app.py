import json
import os
import re
import uuid
import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, time
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ["TABLE_NAME"]
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-session-secret-change-me")
WORKSPACE_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
WORKSPACE_SLUG = "acme-coaching"
TZ = "Australia/Sydney"
DEFAULT_THEME = {
    "preset": "bright",
    "primary": "#2563eb",
    "secondary": "#34a853",
    "accent": "#fbbc05",
    "danger": "#ea4335",
    "background": "#f6f7fb",
    "surface": "#ffffff",
    "text": "#16202a",
    "muted": "#64748b",
    "displayFont": "Plus Jakarta Sans",
    "bodyFont": "Inter",
}

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def response(status, body=None):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
            "access-control-allow-headers": "authorization,content-type,x-workspace-id,x-user-id",
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
        if path == "/api/auth/signup" and method == "POST":
            return response(201, signup(body))
        if path == "/api/auth/login" and method == "POST":
            return response(200, login(body))
        if path == "/api/auth/me" and method == "GET":
            return response(200, auth_context(event))
        if path.startswith("/api/public/booking/"):
            return handle_public(method, path, query, body)
        if path.startswith("/api/public/sites/") and method == "GET":
            return response(200, public_site_page(path))

        context = auth_context(event)
        if path == "/api/calendar/appointment-types" and method == "GET":
            return response(200, list_appointment_types(context["workspaceSlug"]))
        if path == "/api/calendar/appointment-types" and method == "POST":
            return response(201, create_appointment_type(context, body))
        if path.startswith("/api/calendar/appointment-types/") and method == "PUT":
            appointment_id = path.split("/")[4]
            return response(200, update_appointment_type(context, appointment_id, body))
        if path.startswith("/api/calendar/appointment-types/") and method == "DELETE":
            appointment_id = path.split("/")[4]
            return response(200, delete_appointment_type(context, appointment_id))
        if path == "/api/calendar/bookings" and method == "GET":
            return response(200, list_bookings(context["workspaceSlug"]))
        if path == "/api/calendar/availability/me" and method == "GET":
            return response(200, get_availability(context["userId"]))
        if path.startswith("/api/calendar/users/") and path.endswith("/availability") and method == "PUT":
            return response(200, replace_availability(context, body))
        if path == "/api/calendar/unavailability" and method == "GET":
            return response(200, get_unavailability(context["userId"]))
        if path == "/api/calendar/unavailability" and method == "PUT":
            return response(200, replace_unavailability(context["userId"], body))
        if path == "/api/contacts" and method == "GET":
            return response(200, list_contacts(context["workspaceSlug"]))
        if path == "/api/contacts" and method == "POST":
            return response(201, create_contact(context, body))
        if path == "/api/opportunities/pipelines" and method == "GET":
            return response(200, list_pipelines(context["workspaceSlug"]))
        if path == "/api/opportunities/pipelines" and method == "POST":
            return response(201, create_pipeline(context, body))
        if path.startswith("/api/opportunities/pipelines/") and method == "PUT":
            pipeline_id = path.split("/")[4]
            return response(200, update_pipeline(context, pipeline_id, body))
        if path.startswith("/api/opportunities/pipelines/") and method == "DELETE":
            pipeline_id = path.split("/")[4]
            return response(200, delete_pipeline(context, pipeline_id))
        if path == "/api/opportunities" and method == "GET":
            return response(200, list_opportunities(context["workspaceSlug"]))
        if path == "/api/opportunities" and method == "POST":
            return response(201, create_opportunity(context, body))
        if path.startswith("/api/opportunities/") and method == "PUT":
            opportunity_id = path.split("/")[3]
            return response(200, update_opportunity(context, opportunity_id, body))
        if path == "/api/automations" and method == "GET":
            return response(200, list_automations(context["workspaceSlug"]))
        if path == "/api/automations" and method == "POST":
            return response(201, create_automation(context, body))
        if path.startswith("/api/automations/") and method == "PUT":
            automation_id = path.split("/")[3]
            return response(200, update_automation(context, automation_id, body))
        if path.startswith("/api/automations/") and method == "DELETE":
            automation_id = path.split("/")[3]
            return response(200, delete_automation(context, automation_id))
        if path == "/api/sites/pages" and method == "GET":
            return response(200, list_site_pages(context["workspaceSlug"]))
        if path == "/api/sites/pages" and method == "POST":
            return response(201, create_site_page(context, body))
        if path.startswith("/api/sites/pages/") and method == "PUT":
            page_id = path.split("/")[4]
            return response(200, update_site_page(context, page_id, body))
        if path.startswith("/api/sites/pages/") and method == "DELETE":
            page_id = path.split("/")[4]
            return response(200, delete_site_page(context, page_id))
        if path.startswith("/api/contacts/"):
            parts = path.strip("/").split("/")
            contact_id = parts[2] if len(parts) > 2 else ""
            if len(parts) == 3 and method == "GET":
                return response(200, get_contact_by_id(context["workspaceSlug"], contact_id))
            if len(parts) == 3 and method == "PUT":
                return response(200, update_contact(context, contact_id, body))
            if len(parts) == 4 and parts[3] == "tasks" and method == "GET":
                return response(200, list_contact_tasks(context["workspaceSlug"], contact_id))
            if len(parts) == 4 and parts[3] == "tasks" and method == "POST":
                return response(201, create_contact_task(context, contact_id, body))
            if len(parts) == 5 and parts[3] == "tasks" and method == "PUT":
                return response(200, update_contact_task(context, contact_id, parts[4], body))
            if len(parts) == 4 and parts[3] == "activity" and method == "GET":
                return response(200, list_contact_activity(context["workspaceSlug"], contact_id))
        if path == "/api/workspace/theme" and method == "GET":
            return response(200, get_theme(context["workspaceSlug"]))
        if path == "/api/workspace/theme" and method == "PUT":
            return response(200, update_theme(context["workspaceSlug"], body))
        return response(404, {"error": "Not found"})
    except ValueError as exc:
        return response(400, {"error": str(exc)})
    except ConflictError as exc:
        return response(409, {"error": str(exc)})
    except PermissionError as exc:
        return response(401, {"error": str(exc)})


class ConflictError(Exception):
    pass


def workspace_pk(slug=WORKSPACE_SLUG):
    return f"WS#{slug}"


def appt_sk(slug):
    return f"APPT#{slug}"


def normalize_email(email):
    return email.strip().lower()


def slugify(value):
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    return "-".join(part for part in cleaned.split("-") if part)[:60] or f"workspace-{uuid.uuid4().hex[:8]}"


def bounded_int(value, minimum, maximum, label):
    try:
        number = int(value)
    except Exception:
        raise ValueError(f"{label} must be a number.")
    if number < minimum or number > maximum:
        raise ValueError(f"{label} must be between {minimum} and {maximum}.")
    return number


def hash_password(password, salt=None):
    salt_bytes = base64.b64decode(salt) if salt else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 200_000)
    return base64.b64encode(salt_bytes).decode(), base64.b64encode(digest).decode()


def verify_password(password, salt, expected_hash):
    _, actual = hash_password(password, salt)
    return hmac.compare_digest(actual, expected_hash)


def sign_token(payload):
    token_payload = {**payload, "exp": int(datetime.utcnow().timestamp()) + 60 * 60 * 24 * 7}
    raw = base64.urlsafe_b64encode(json.dumps(token_payload, separators=(",", ":")).encode()).decode().rstrip("=")
    sig = hmac.new(SESSION_SECRET.encode(), raw.encode(), hashlib.sha256).digest()
    return f"{raw}.{base64.urlsafe_b64encode(sig).decode().rstrip('=')}"


def verify_token(token):
    try:
        raw, signature = token.split(".", 1)
        expected = hmac.new(SESSION_SECRET.encode(), raw.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            raise PermissionError("Invalid session.")
        payload = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
        if payload["exp"] < int(datetime.utcnow().timestamp()):
            raise PermissionError("Session expired.")
        return payload
    except Exception as exc:
        if isinstance(exc, PermissionError):
            raise
        raise PermissionError("Invalid session.")


def auth_context(event):
    header = (event.get("headers") or {}).get("authorization") or (event.get("headers") or {}).get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        raise PermissionError("Login required.")
    payload = verify_token(header.split(" ", 1)[1])
    return {"userId": payload["userId"], "workspaceSlug": payload["workspaceSlug"], "email": payload["email"], "workspaceName": payload.get("workspaceName", "Workspace")}


def signup(data):
    email = normalize_email(data["email"])
    password = data["password"]
    workspace_name = data.get("workspaceName") or data.get("businessName") or "My Business"
    workspace_slug = slugify(data.get("workspaceSlug") or workspace_name)
    existing = table.get_item(Key={"pk": f"AUTH#{email}", "sk": "USER"}).get("Item")
    if existing:
        raise ValueError("An account already exists for this email.")
    user_id = str(uuid.uuid4())
    workspace_id = str(uuid.uuid4())
    salt, password_hash = hash_password(password)
    now = datetime.utcnow().isoformat() + "Z"
    table.put_item(Item={"pk": workspace_pk(workspace_slug), "sk": "META", "id": workspace_id, "name": workspace_name, "slug": workspace_slug, "timezone": TZ, "theme": DEFAULT_THEME, "entity": "workspace", "createdAtUtc": now})
    table.put_item(Item={"pk": f"AUTH#{email}", "sk": "USER", "entity": "authUser", "id": user_id, "email": email, "workspaceSlug": workspace_slug, "workspaceName": workspace_name, "passwordSalt": salt, "passwordHash": password_hash, "createdAtUtc": now})
    seed_workspace_defaults(workspace_slug, workspace_id, user_id, workspace_name, now)
    token = sign_token({"userId": user_id, "workspaceSlug": workspace_slug, "email": email, "workspaceName": workspace_name})
    return {"token": token, "user": {"email": email, "workspaceSlug": workspace_slug, "workspaceName": workspace_name, "userId": user_id}}


def login(data):
    email = normalize_email(data["email"])
    user = table.get_item(Key={"pk": f"AUTH#{email}", "sk": "USER"}).get("Item")
    if not user or not verify_password(data["password"], user["passwordSalt"], user["passwordHash"]):
        raise PermissionError("Invalid email or password.")
    token = sign_token({"userId": user["id"], "workspaceSlug": user["workspaceSlug"], "email": email, "workspaceName": user.get("workspaceName", "Workspace")})
    return {"token": token, "user": {"email": email, "workspaceSlug": user["workspaceSlug"], "workspaceName": user.get("workspaceName", "Workspace"), "userId": user["id"]}}


def ensure_seed():
    existing = table.get_item(Key={"pk": workspace_pk(), "sk": "META"}).get("Item")
    if existing:
        return

    now = datetime.utcnow().isoformat() + "Z"
    table.put_item(Item={"pk": workspace_pk(), "sk": "META", "id": WORKSPACE_ID, "name": "Acme Coaching", "slug": WORKSPACE_SLUG, "timezone": TZ, "theme": DEFAULT_THEME, "entity": "workspace", "createdAtUtc": now})
    seed_workspace_defaults(WORKSPACE_SLUG, WORKSPACE_ID, USER_ID, "Acme Coaching", now)


def seed_workspace_defaults(workspace_slug, workspace_id, user_id, workspace_name, now):
    table.put_item(Item={
        "pk": workspace_pk(workspace_slug), "sk": appt_sk("discovery-call"), "entity": "appointmentType",
        "id": "33333333-3333-3333-3333-333333333333" if workspace_slug == WORKSPACE_SLUG else str(uuid.uuid4()), "workspaceId": workspace_id, "assignedUserId": user_id,
        "name": "Discovery Call", "description": "A short introductory consultation.", "slug": "discovery-call",
        "durationMinutes": 30, "locationType": "Online", "locationValue": "Meeting link provided after booking",
        "bufferBeforeMinutes": 0, "bufferAfterMinutes": 15, "minimumNoticeMinutes": 120,
        "maximumBookingWindowDays": 30, "serviceIntervalMinutes": 15, "lookBusyPercentage": 0, "timezone": TZ, "isActive": True, "createdAtUtc": now,
    })
    for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
        table.put_item(Item={"pk": f"USER#{user_id}", "sk": f"AVAIL#{day}#09:00", "entity": "availability", "workspaceSlug": workspace_slug, "userId": user_id, "dayOfWeek": day, "startTime": "09:00", "endTime": "17:00", "timezone": TZ})


def list_appointment_types(workspace_slug=WORKSPACE_SLUG):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("APPT#"))
    return [public_appt_shape(item) for item in result.get("Items", [])]


def create_appointment_type(context, data):
    slug = data["slug"].strip().lower()
    existing = table.get_item(Key={"pk": workspace_pk(context["workspaceSlug"]), "sk": appt_sk(slug)}).get("Item")
    if existing:
        raise ValueError("This public link slug already exists. Edit the existing appointment type or choose a different slug.")
    workspace = table.get_item(Key={"pk": workspace_pk(context["workspaceSlug"]), "sk": "META"}).get("Item") or {}
    duration = bounded_int(data.get("durationMinutes", 30), 1, 1440, "Duration")
    interval = bounded_int(data.get("serviceIntervalMinutes", 15), 1, 1440, "Service interval")
    item = {
        "pk": workspace_pk(context["workspaceSlug"]), "sk": appt_sk(slug), "entity": "appointmentType",
        "id": str(uuid.uuid4()), "workspaceId": workspace.get("id", context["workspaceSlug"]), "assignedUserId": context["userId"],
        "name": data["name"], "description": data.get("description"), "slug": slug,
        "durationMinutes": duration, "locationType": data.get("locationType", "Online"),
        "locationValue": data.get("locationValue"), "bufferBeforeMinutes": int(data.get("bufferBeforeMinutes", 0)),
        "bufferAfterMinutes": int(data.get("bufferAfterMinutes", 0)), "minimumNoticeMinutes": bounded_int(data.get("minimumNoticeMinutes", 0), 0, 525600, "Minimum scheduling notice"),
        "maximumBookingWindowDays": int(data.get("maximumBookingWindowDays", 30)), "serviceIntervalMinutes": interval,
        "lookBusyPercentage": bounded_int(data.get("lookBusyPercentage", 0), 0, 100, "Look busy percentage"),
        "timezone": data.get("timezone", TZ),
        "isActive": True, "createdAtUtc": datetime.utcnow().isoformat() + "Z",
    }
    table.put_item(Item=item)
    return public_appt_shape(item)


def update_appointment_type(context, appointment_id, data):
    current = find_appointment_by_id(context["workspaceSlug"], appointment_id)
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
        "durationMinutes": bounded_int(data.get("durationMinutes", current.get("durationMinutes", 30)), 1, 1440, "Duration"),
        "locationType": data.get("locationType", current.get("locationType", "Online")),
        "locationValue": data.get("locationValue"),
        "bufferBeforeMinutes": int(data.get("bufferBeforeMinutes", current.get("bufferBeforeMinutes", 0))),
        "bufferAfterMinutes": int(data.get("bufferAfterMinutes", current.get("bufferAfterMinutes", 0))),
        "minimumNoticeMinutes": bounded_int(data.get("minimumNoticeMinutes", current.get("minimumNoticeMinutes", 0)), 0, 525600, "Minimum scheduling notice"),
        "maximumBookingWindowDays": int(data.get("maximumBookingWindowDays", current.get("maximumBookingWindowDays", 30))),
        "serviceIntervalMinutes": bounded_int(data.get("serviceIntervalMinutes", current.get("serviceIntervalMinutes", 15)), 1, 1440, "Service interval"),
        "lookBusyPercentage": bounded_int(data.get("lookBusyPercentage", current.get("lookBusyPercentage", 0)), 0, 100, "Look busy percentage"),
        "timezone": data.get("timezone", current.get("timezone", TZ)),
        "isActive": bool(data.get("isActive", current.get("isActive", True))),
        "updatedAtUtc": datetime.utcnow().isoformat() + "Z",
    }
    if old_key["sk"] != updated["sk"]:
        table.delete_item(Key=old_key)
    table.put_item(Item=updated)
    return public_appt_shape(updated)


def delete_appointment_type(context, appointment_id):
    current = find_appointment_by_id(context["workspaceSlug"], appointment_id)
    if not current:
        raise ValueError("Appointment type not found.")
    existing_bookings = [booking for booking in list_bookings(context["workspaceSlug"]) if booking.get("appointmentTypeId") == appointment_id]
    if existing_bookings:
        raise ConflictError("This appointment type has bookings, so it cannot be permanently deleted. Make it inactive instead.")
    table.delete_item(Key={"pk": current["pk"], "sk": current["sk"]})
    return {"deleted": True, "id": appointment_id}


def find_appointment_by_id(workspace_slug, appointment_id):
    for item in table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("APPT#")).get("Items", []):
        if item.get("id") == appointment_id:
            return item
    return None


def public_appt_shape(item):
    shaped = {k: item.get(k) for k in ["id", "workspaceId", "assignedUserId", "name", "description", "slug", "durationMinutes", "locationType", "locationValue", "bufferBeforeMinutes", "bufferAfterMinutes", "minimumNoticeMinutes", "maximumBookingWindowDays", "serviceIntervalMinutes", "lookBusyPercentage", "timezone", "isActive"]}
    shaped["serviceIntervalMinutes"] = int(shaped.get("serviceIntervalMinutes") or 15)
    shaped["lookBusyPercentage"] = int(shaped.get("lookBusyPercentage") or 0)
    return shaped


def get_appointment(workspace_slug, slug):
    item = table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": appt_sk(slug)}).get("Item")
    if not item or not item.get("isActive", True):
        raise ValueError("Appointment type not found.")
    return item


def get_availability(user_id):
    result = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("AVAIL#"))
    return [{k: item.get(k) for k in ["dayOfWeek", "startTime", "endTime", "timezone"]} for item in result.get("Items", [])]


def normalize_time(value):
    hour, minute = str(value).strip().split(":")[:2]
    return f"{int(hour):02d}:{int(minute):02d}"


def replace_availability(context, data):
    user_id = context["userId"]
    existing = table.query(KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("AVAIL#")).get("Items", [])
    normalized_rules = {}
    for rule in data.get("rules", []):
        start_time = normalize_time(rule["startTime"])
        end_time = normalize_time(rule["endTime"])
        if start_time >= end_time:
            raise ValueError("Availability start time must be before end time.")
        key = (rule["dayOfWeek"], start_time)
        normalized_rules[key] = {
            "dayOfWeek": rule["dayOfWeek"],
            "startTime": start_time,
            "endTime": end_time,
        }

    with table.batch_writer() as batch:
        for item in existing:
            batch.delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
    with table.batch_writer() as batch:
        for rule in normalized_rules.values():
            batch.put_item(Item={"pk": f"USER#{user_id}", "sk": f"AVAIL#{rule['dayOfWeek']}#{rule['startTime']}", "entity": "availability", "workspaceSlug": context["workspaceSlug"], "userId": user_id, "dayOfWeek": rule["dayOfWeek"], "startTime": rule["startTime"], "endTime": rule["endTime"], "timezone": data.get("timezone", TZ)})
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


def list_contacts(workspace_slug):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("CONTACT#"))
    return [contact_shape(item) for item in result.get("Items", [])]


def contact_shape(item):
    return {k: item.get(k) for k in ["id", "firstName", "lastName", "email", "phone", "company", "jobTitle", "addressLine1", "addressLine2", "city", "state", "postalCode", "country", "timezone", "source", "notes", "tags", "customFields", "createdAtUtc", "updatedAtUtc"]}


def clean_contact_data(data):
    email = normalize_email(data.get("email", ""))
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email):
        raise ValueError("Enter a valid contact email address.")
    phone = str(data.get("phone", "")).strip()
    if phone and not re.match(r"^\+?[0-9\s().-]{7,20}$", phone):
        raise ValueError("Enter a valid contact phone number.")
    custom_fields = data.get("customFields") or {}
    if not isinstance(custom_fields, dict):
        raise ValueError("Custom fields must be an object.")
    return {
        "firstName": str(data.get("firstName", "")).strip()[:80],
        "lastName": str(data.get("lastName", "")).strip()[:80],
        "email": email,
        "normalizedEmail": email,
        "phone": phone[:30],
        "company": str(data.get("company", "")).strip()[:120],
        "jobTitle": str(data.get("jobTitle", "")).strip()[:120],
        "addressLine1": str(data.get("addressLine1", "")).strip()[:160],
        "addressLine2": str(data.get("addressLine2", "")).strip()[:160],
        "city": str(data.get("city", "")).strip()[:80],
        "state": str(data.get("state", "")).strip()[:80],
        "postalCode": str(data.get("postalCode", "")).strip()[:30],
        "country": str(data.get("country", "")).strip()[:80],
        "timezone": str(data.get("timezone", TZ)).strip()[:80],
        "source": str(data.get("source", "Manual")).strip()[:80],
        "notes": str(data.get("notes", "")).strip()[:2000],
        "tags": [str(tag).strip()[:40] for tag in data.get("tags", []) if str(tag).strip()][:20],
        "customFields": clean_custom_fields(custom_fields),
    }


def clean_custom_fields(custom_fields):
    allowed_types = {"text", "multiline", "textList", "number", "phone", "currency", "dropdownSingle", "dropdownMultiple", "radio", "checkbox", "date", "file", "signature"}
    cleaned = {}
    for key, field in custom_fields.items():
        name = str(key).strip()[:60]
        if not name:
            continue
        if isinstance(field, dict):
            field_type = str(field.get("type", "text"))
            if field_type not in allowed_types:
                field_type = "text"
            value = field.get("value", "")
            if isinstance(value, list):
                clean_value = [str(item).strip()[:300] for item in value if str(item).strip()][:50]
            elif isinstance(value, bool):
                clean_value = value
            else:
                clean_value = str(value).strip()[:1000]
            options = [str(option).strip()[:120] for option in field.get("options", []) if str(option).strip()][:50]
            cleaned[name] = {"type": field_type, "value": clean_value, "options": options}
        else:
            cleaned[name] = {"type": "text", "value": str(field).strip()[:1000], "options": []}
    return cleaned


def create_contact(context, data):
    clean = clean_contact_data(data)
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"CONTACT#{clean['normalizedEmail']}", "entity": "contact", "id": str(uuid.uuid4()), **clean, "createdAtUtc": now, "updatedAtUtc": now}
    existing = table.get_item(Key={"pk": item["pk"], "sk": item["sk"]}).get("Item")
    if existing:
        raise ValueError("A contact already exists with this email.")
    table.put_item(Item=item)
    add_contact_activity(context["workspaceSlug"], item["id"], "ContactCreated", "Contact created", "Created manually in Contacts.")
    return contact_shape(item)


def find_contact_item(workspace_slug, contact_id):
    for item in table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("CONTACT#")).get("Items", []):
        if item.get("id") == contact_id:
            return item
    return None


def get_contact_by_email(workspace_slug, email):
    return table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": f"CONTACT#{normalize_email(email)}"}).get("Item")


def get_contact_by_id(workspace_slug, contact_id):
    item = find_contact_item(workspace_slug, contact_id)
    if not item:
        raise ValueError("Contact not found.")
    return contact_shape(item)


def update_contact(context, contact_id, data):
    current = find_contact_item(context["workspaceSlug"], contact_id)
    if not current:
        raise ValueError("Contact not found.")
    clean = clean_contact_data(data)
    now = datetime.utcnow().isoformat() + "Z"
    updated = {**current, **clean, "updatedAtUtc": now}
    old_key = {"pk": current["pk"], "sk": current["sk"]}
    updated["sk"] = f"CONTACT#{clean['normalizedEmail']}"
    if old_key["sk"] != updated["sk"]:
        table.delete_item(Key=old_key)
    table.put_item(Item=updated)
    add_contact_activity(context["workspaceSlug"], contact_id, "ContactUpdated", "Contact updated", "Contact profile was edited.")
    return contact_shape(updated)


def upsert_booking_contact(workspace_slug, customer, timezone):
    pk = workspace_pk(workspace_slug)
    email = customer["email"].strip().lower()
    now = datetime.utcnow().isoformat() + "Z"
    existing = table.get_item(Key={"pk": pk, "sk": f"CONTACT#{email}"}).get("Item") or {}
    item = {
        **existing,
        "pk": pk,
        "sk": f"CONTACT#{email}",
        "entity": "contact",
        "id": existing.get("id", str(uuid.uuid4())),
        "firstName": customer["firstName"],
        "lastName": customer["lastName"],
        "email": customer["email"],
        "normalizedEmail": email,
        "phone": customer["phone"],
        "timezone": timezone,
        "source": existing.get("source", "CalendarBooking"),
        "customFields": existing.get("customFields", {}),
        "tags": existing.get("tags", []),
        "createdAtUtc": existing.get("createdAtUtc", now),
        "updatedAtUtc": now,
    }
    table.put_item(Item=item)
    return item


def add_contact_activity(workspace_slug, contact_id, activity_type, title, description="", metadata=None):
    activity_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(workspace_slug), "sk": f"ACTIVITY#{contact_id}#{now}#{activity_id}", "entity": "contactActivity", "id": activity_id, "contactId": contact_id, "type": activity_type, "title": title, "description": description, "metadata": metadata or {}, "occurredAtUtc": now}
    table.put_item(Item=item)
    return item


def list_contact_activity(workspace_slug, contact_id):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with(f"ACTIVITY#{contact_id}#"), ScanIndexForward=False)
    return [{k: item.get(k) for k in ["id", "contactId", "type", "title", "description", "occurredAtUtc", "metadata"]} for item in result.get("Items", [])]


def list_contact_tasks(workspace_slug, contact_id):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with(f"TASK#{contact_id}#"))
    return [{k: item.get(k) for k in ["id", "contactId", "title", "description", "dueDate", "status", "createdAtUtc", "completedAtUtc"]} for item in result.get("Items", [])]


def create_contact_task(context, contact_id, data):
    if not find_contact_item(context["workspaceSlug"], contact_id):
        raise ValueError("Contact not found.")
    title = str(data.get("title", "")).strip()
    if not title:
        raise ValueError("Task title is required.")
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"TASK#{contact_id}#{task_id}", "entity": "contactTask", "id": task_id, "contactId": contact_id, "title": title[:160], "description": str(data.get("description", "")).strip()[:1000], "dueDate": str(data.get("dueDate", "")).strip()[:20], "status": "Open", "createdAtUtc": now}
    table.put_item(Item=item)
    add_contact_activity(context["workspaceSlug"], contact_id, "TaskCreated", "Task created", title)
    return {k: item.get(k) for k in ["id", "contactId", "title", "description", "dueDate", "status", "createdAtUtc", "completedAtUtc"]}


def update_contact_task(context, contact_id, task_id, data):
    key = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"TASK#{contact_id}#{task_id}"}
    current = table.get_item(Key=key).get("Item")
    if not current:
        raise ValueError("Task not found.")
    status = data.get("status", current.get("status", "Open"))
    updated = {**current, "title": str(data.get("title", current.get("title", ""))).strip()[:160], "description": str(data.get("description", current.get("description", ""))).strip()[:1000], "dueDate": str(data.get("dueDate", current.get("dueDate", ""))).strip()[:20], "status": "Done" if status == "Done" else "Open"}
    if updated["status"] == "Done" and current.get("status") != "Done":
        updated["completedAtUtc"] = datetime.utcnow().isoformat() + "Z"
        add_contact_activity(context["workspaceSlug"], contact_id, "TaskCompleted", "Task completed", updated["title"])
    table.put_item(Item=updated)
    return {k: updated.get(k) for k in ["id", "contactId", "title", "description", "dueDate", "status", "createdAtUtc", "completedAtUtc"]}


def default_pipeline_stages():
    return [
        {"id": "stage-new-lead", "name": "New Lead", "order": 1},
        {"id": "stage-qualified", "name": "Qualified", "order": 2},
        {"id": "stage-proposal", "name": "Proposal", "order": 3},
        {"id": "stage-won", "name": "Won", "order": 4},
    ]


def pipeline_shape(item):
    return {k: item.get(k) for k in ["id", "name", "description", "stages", "isDefault", "createdAtUtc", "updatedAtUtc"]}


def list_pipelines(workspace_slug):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("PIPELINE#"))
    items = result.get("Items", [])
    if not items:
        now = datetime.utcnow().isoformat() + "Z"
        item = {"pk": workspace_pk(workspace_slug), "sk": "PIPELINE#default", "entity": "pipeline", "id": "default", "name": "Sales Pipeline", "description": "Default opportunity pipeline.", "stages": default_pipeline_stages(), "isDefault": True, "createdAtUtc": now}
        table.put_item(Item=item)
        items = [item]
    return [pipeline_shape(item) for item in items]


def clean_stages(stages):
    cleaned = []
    for index, stage in enumerate(stages or []):
        name = str(stage.get("name", "")).strip()[:80]
        if not name:
            continue
        stage_id = str(stage.get("id") or slugify(name) or f"stage-{index + 1}")[:80]
        cleaned.append({"id": stage_id, "name": name, "order": int(stage.get("order", index + 1))})
    if not cleaned:
        raise ValueError("At least one pipeline stage is required.")
    return cleaned


def create_pipeline(context, data):
    name = str(data.get("name", "")).strip()
    if not name:
        raise ValueError("Pipeline name is required.")
    pipeline_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"PIPELINE#{pipeline_id}", "entity": "pipeline", "id": pipeline_id, "name": name[:120], "description": str(data.get("description", "")).strip()[:1000], "stages": clean_stages(data.get("stages", [])), "isDefault": False, "createdAtUtc": now}
    table.put_item(Item=item)
    return pipeline_shape(item)


def find_pipeline(workspace_slug, pipeline_id):
    item = table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": f"PIPELINE#{pipeline_id}"}).get("Item")
    if item:
        return item
    if pipeline_id == "default":
        list_pipelines(workspace_slug)
        return table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": "PIPELINE#default"}).get("Item")
    return None


def update_pipeline(context, pipeline_id, data):
    current = find_pipeline(context["workspaceSlug"], pipeline_id)
    if not current:
        raise ValueError("Pipeline not found.")
    updated = {**current, "name": str(data.get("name", current.get("name", ""))).strip()[:120], "description": str(data.get("description", current.get("description", ""))).strip()[:1000], "stages": clean_stages(data.get("stages", current.get("stages", []))), "updatedAtUtc": datetime.utcnow().isoformat() + "Z"}
    table.put_item(Item=updated)
    return pipeline_shape(updated)


def delete_pipeline(context, pipeline_id):
    current = find_pipeline(context["workspaceSlug"], pipeline_id)
    if not current:
        raise ValueError("Pipeline not found.")
    for opportunity in list_opportunities(context["workspaceSlug"]):
        if opportunity.get("pipelineId") == pipeline_id:
            raise ConflictError("This pipeline has opportunities, so it cannot be deleted.")
    table.delete_item(Key={"pk": workspace_pk(context["workspaceSlug"]), "sk": f"PIPELINE#{pipeline_id}"})
    return {"deleted": True, "id": pipeline_id}


def opportunity_shape(item):
    return {k: item.get(k) for k in ["id", "pipelineId", "stageId", "contactId", "contactName", "title", "value", "currency", "status", "expectedCloseDate", "source", "notes", "createdAtUtc", "updatedAtUtc"]}


def list_opportunities(workspace_slug):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("OPP#"))
    return [opportunity_shape(item) for item in result.get("Items", [])]


def find_opportunity(workspace_slug, opportunity_id):
    return table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": f"OPP#{opportunity_id}"}).get("Item")


def clean_opportunity(context, data, current=None):
    pipeline_id = str(data.get("pipelineId", current.get("pipelineId") if current else "")).strip()
    pipeline = find_pipeline(context["workspaceSlug"], pipeline_id)
    if not pipeline:
        raise ValueError("Pipeline not found.")
    stage_id = str(data.get("stageId", current.get("stageId") if current else "")).strip()
    valid_stage_ids = {stage["id"] for stage in pipeline.get("stages", [])}
    if stage_id not in valid_stage_ids:
        raise ValueError("Pipeline stage not found.")
    title = str(data.get("title", current.get("title") if current else "")).strip()
    if not title:
        raise ValueError("Opportunity title is required.")
    contact_id = str(data.get("contactId", current.get("contactId", "") if current else "") or "").strip()
    contact_name = str(data.get("contactName", current.get("contactName", "") if current else "") or "").strip()
    if contact_id:
        contact = find_contact_item(context["workspaceSlug"], contact_id)
        if contact:
            contact_name = f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()
    return {
        "pipelineId": pipeline_id,
        "stageId": stage_id,
        "contactId": contact_id,
        "contactName": contact_name[:160],
        "title": title[:160],
        "value": Decimal(str(data.get("value", current.get("value", 0) if current else 0) or 0)),
        "currency": str(data.get("currency", current.get("currency", "AUD") if current else "AUD")).strip().upper()[:3],
        "status": data.get("status", current.get("status", "Open") if current else "Open") if data.get("status", "Open") in ["Open", "Won", "Lost"] else "Open",
        "expectedCloseDate": str(data.get("expectedCloseDate", current.get("expectedCloseDate", "") if current else "") or "").strip()[:20],
        "source": str(data.get("source", current.get("source", "") if current else "") or "").strip()[:80],
        "notes": str(data.get("notes", current.get("notes", "") if current else "") or "").strip()[:2000],
    }


def create_opportunity(context, data):
    clean = clean_opportunity(context, data)
    opportunity_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"OPP#{opportunity_id}", "entity": "opportunity", "id": opportunity_id, **clean, "createdAtUtc": now, "updatedAtUtc": now}
    table.put_item(Item=item)
    if item.get("contactId"):
        add_contact_activity(context["workspaceSlug"], item["contactId"], "OpportunityCreated", "Opportunity created", item["title"], {"opportunityId": opportunity_id})
    return opportunity_shape(item)


def update_opportunity(context, opportunity_id, data):
    current = find_opportunity(context["workspaceSlug"], opportunity_id)
    if not current:
        raise ValueError("Opportunity not found.")
    clean = clean_opportunity(context, data, current)
    updated = {**current, **clean, "updatedAtUtc": datetime.utcnow().isoformat() + "Z"}
    table.put_item(Item=updated)
    if updated.get("contactId") and current.get("stageId") != updated.get("stageId"):
        add_contact_activity(context["workspaceSlug"], updated["contactId"], "OpportunityMoved", "Opportunity moved", updated["title"], {"opportunityId": opportunity_id, "stageId": updated["stageId"]})
    return opportunity_shape(updated)


VALID_AUTOMATION_TRIGGERS = {
    "AppointmentBooked",
    "BookingCancelled",
    "AppointmentTypeCreated",
    "AvailabilityChanged",
    "ContactCreated",
    "ContactUpdated",
    "ContactTagAdded",
    "PageVisited",
    "OpportunityCreated",
    "OpportunityMoved",
    "PipelineCreated",
    "AutomationStarted",
    "SitePageCreated",
    "SitePagePublished",
    "SitePageVisited",
    "TaskCompleted",
}

VALID_AUTOMATION_ACTIONS = {
    "CreateTask",
    "AddContactTag",
    "RemoveContactTag",
    "SendEmail",
    "InternalNotification",
    "Webhook",
    "IfElse",
    "Wait",
    "Branch",
    "Goal",
    "StartAutomation",
    "StopAutomation",
}


def automation_shape(item):
    shaped = {k: item.get(k) for k in ["id", "name", "description", "trigger", "triggers", "actions", "isActive", "createdAtUtc", "updatedAtUtc"]}
    if not shaped.get("triggers") and shaped.get("trigger"):
        shaped["triggers"] = [shaped["trigger"]]
    return shaped


def list_automations(workspace_slug):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("AUTOMATION#"))
    return sorted([automation_shape(item) for item in result.get("Items", [])], key=lambda item: item.get("createdAtUtc", ""), reverse=True)


def find_automation(workspace_slug, automation_id):
    return table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": f"AUTOMATION#{automation_id}"}).get("Item")


def clean_automation(data, current=None):
    name = str(data.get("name", current.get("name", "") if current else "")).strip()
    if not name:
        raise ValueError("Automation name is required.")
    raw_triggers = data.get("triggers")
    if not isinstance(raw_triggers, list) or not raw_triggers:
        raw_triggers = [data.get("trigger", current.get("trigger", {}) if current else {}) or {}]
    triggers = []
    for trigger in raw_triggers[:10]:
        trigger_type = str(trigger.get("type", "")).strip()
        if trigger_type not in VALID_AUTOMATION_TRIGGERS:
            raise ValueError("Automation trigger is not supported.")
        filters = trigger.get("filters", {}) if isinstance(trigger.get("filters", {}), dict) else {}
        clean_filters = {str(k).strip()[:80]: str(v).strip()[:200] for k, v in filters.items() if str(k).strip()}
        triggers.append({"type": trigger_type, "filters": clean_filters})
    actions = []
    for index, action in enumerate(data.get("actions", current.get("actions", []) if current else []) or []):
        action_type = str(action.get("type", "")).strip()
        if action_type not in VALID_AUTOMATION_ACTIONS:
            raise ValueError("Automation action is not supported.")
        config = action.get("config", {}) if isinstance(action.get("config", {}), dict) else {}
        actions.append({
            "id": str(action.get("id") or f"action-{index + 1}")[:80],
            "type": action_type,
            "config": {str(k).strip()[:80]: str(v).strip()[:1000] for k, v in config.items() if str(k).strip()},
        })
    if not actions:
        raise ValueError("At least one automation action is required.")
    return {
        "name": name[:140],
        "description": str(data.get("description", current.get("description", "") if current else "") or "").strip()[:1000],
        "trigger": triggers[0],
        "triggers": triggers,
        "actions": actions[:50],
        "isActive": bool(data.get("isActive", current.get("isActive", True) if current else True)),
    }


def create_automation(context, data):
    automation_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"AUTOMATION#{automation_id}", "entity": "automation", "id": automation_id, **clean_automation(data), "createdAtUtc": now}
    table.put_item(Item=item)
    return automation_shape(item)


def update_automation(context, automation_id, data):
    current = find_automation(context["workspaceSlug"], automation_id)
    if not current:
        raise ValueError("Automation not found.")
    updated = {**current, **clean_automation(data, current), "updatedAtUtc": datetime.utcnow().isoformat() + "Z"}
    table.put_item(Item=updated)
    return automation_shape(updated)


def delete_automation(context, automation_id):
    current = find_automation(context["workspaceSlug"], automation_id)
    if not current:
        raise ValueError("Automation not found.")
    table.delete_item(Key={"pk": workspace_pk(context["workspaceSlug"]), "sk": f"AUTOMATION#{automation_id}"})
    return {"deleted": True, "id": automation_id}


def site_page_shape(item):
    return {k: item.get(k) for k in ["id", "name", "slug", "status", "template", "seoTitle", "seoDescription", "theme", "sections", "createdAtUtc", "updatedAtUtc"]}


def list_site_pages(workspace_slug):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("SITEPAGE#"))
    return sorted([site_page_shape(item) for item in result.get("Items", [])], key=lambda item: item.get("updatedAtUtc", item.get("createdAtUtc", "")), reverse=True)


def find_site_page(workspace_slug, page_id):
    return table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": f"SITEPAGE#{page_id}"}).get("Item")


def find_site_page_by_slug(workspace_slug, slug):
    for page in list_site_pages(workspace_slug):
        if page.get("slug") == slug:
            return page
    return None


def clean_site_sections(sections):
    cleaned = []
    for index, section in enumerate(sections or []):
        section_type = str(section.get("type", "hero")).strip()
        if section_type not in ["hero", "features", "cta", "text", "image", "columns", "split"]:
            section_type = "hero"
        columns = section.get("columns", []) if isinstance(section.get("columns", []), list) else []
        cleaned.append({
            "id": str(section.get("id") or f"section-{index + 1}")[:80],
            "type": section_type,
            "eyebrow": str(section.get("eyebrow", "") or "").strip()[:120],
            "headline": str(section.get("headline", "") or "").strip()[:180],
            "body": str(section.get("body", "") or "").strip()[:1500],
            "buttonText": str(section.get("buttonText", "") or "").strip()[:80],
            "buttonUrl": str(section.get("buttonUrl", "") or "").strip()[:300],
            "imageUrl": str(section.get("imageUrl", "") or "").strip()[:1000],
            "background": str(section.get("background", "white") or "white").strip()[:40],
            "align": str(section.get("align", "left") or "left").strip()[:20],
            "padding": str(section.get("padding", "normal") or "normal").strip()[:20],
            "items": [str(item).strip()[:160] for item in section.get("items", [])[:12] if str(item).strip()],
            "columns": [{"title": str(col.get("title", "")).strip()[:160], "body": str(col.get("body", "")).strip()[:800], "imageUrl": str(col.get("imageUrl", "") or "").strip()[:1000]} for col in columns[:6] if str(col.get("title", "")).strip() or str(col.get("body", "")).strip()],
        })
    if not cleaned:
        raise ValueError("At least one page section is required.")
    return cleaned


def clean_site_page(data, current=None):
    name = str(data.get("name", current.get("name", "") if current else "")).strip()
    slug = slugify(str(data.get("slug", current.get("slug", name) if current else name))).strip()
    if not name or not slug:
        raise ValueError("Page name and slug are required.")
    status = str(data.get("status", current.get("status", "Draft") if current else "Draft"))
    return {
        "name": name[:140],
        "slug": slug[:80],
        "status": status if status in ["Draft", "Published"] else "Draft",
        "template": str(data.get("template", current.get("template", "coach") if current else "coach"))[:40],
        "seoTitle": str(data.get("seoTitle", current.get("seoTitle", name) if current else name) or "").strip()[:160],
        "seoDescription": str(data.get("seoDescription", current.get("seoDescription", "") if current else "") or "").strip()[:300],
        "theme": data.get("theme", current.get("theme", {}) if current else {}) if isinstance(data.get("theme", current.get("theme", {}) if current else {}), dict) else {},
        "sections": clean_site_sections(data.get("sections", current.get("sections", []) if current else [])),
    }


def create_site_page(context, data):
    page_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    clean = clean_site_page(data)
    existing = find_site_page_by_slug(context["workspaceSlug"], clean["slug"])
    if existing:
        raise ConflictError("A page with this slug already exists.")
    item = {"pk": workspace_pk(context["workspaceSlug"]), "sk": f"SITEPAGE#{page_id}", "entity": "sitePage", "id": page_id, **clean, "createdAtUtc": now, "updatedAtUtc": now}
    table.put_item(Item=item)
    return site_page_shape(item)


def update_site_page(context, page_id, data):
    current = find_site_page(context["workspaceSlug"], page_id)
    if not current:
        raise ValueError("Page not found.")
    clean = clean_site_page(data, current)
    existing = find_site_page_by_slug(context["workspaceSlug"], clean["slug"])
    if existing and existing.get("id") != page_id:
        raise ConflictError("A page with this slug already exists.")
    updated = {**current, **clean, "updatedAtUtc": datetime.utcnow().isoformat() + "Z"}
    table.put_item(Item=updated)
    return site_page_shape(updated)


def delete_site_page(context, page_id):
    current = find_site_page(context["workspaceSlug"], page_id)
    if not current:
        raise ValueError("Page not found.")
    table.delete_item(Key={"pk": workspace_pk(context["workspaceSlug"]), "sk": f"SITEPAGE#{page_id}"})
    return {"deleted": True, "id": page_id}


def public_site_page(path):
    parts = path.strip("/").split("/")
    workspace_slug = parts[3] if len(parts) > 3 else ""
    page_slug = parts[4] if len(parts) > 4 else ""
    page = find_site_page_by_slug(workspace_slug, page_slug)
    if not page or page.get("status") != "Published":
        raise ValueError("Page not found.")
    return {"page": page, "theme": get_theme(workspace_slug)}


def get_workspace(workspace_slug):
    if workspace_slug == WORKSPACE_SLUG:
        workspace = table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": "META"}).get("Item")
        return workspace or {"name": "Acme Coaching", "theme": DEFAULT_THEME}
    workspace = table.get_item(Key={"pk": workspace_pk(workspace_slug), "sk": "META"}).get("Item")
    if not workspace:
        raise ValueError("Workspace not found.")
    return workspace


def get_theme(workspace_slug):
    workspace = get_workspace(workspace_slug)
    return {**DEFAULT_THEME, **(workspace.get("theme") or {})}


def clean_theme(data):
    allowed_fonts = {"Inter", "Plus Jakarta Sans", "Poppins", "DM Sans", "Manrope", "Montserrat", "Lora", "Playfair Display", "Nunito Sans", "Outfit"}
    theme = {**DEFAULT_THEME, **{k: data.get(k, DEFAULT_THEME[k]) for k in DEFAULT_THEME}}
    for key in ["primary", "secondary", "accent", "danger", "background", "surface", "text", "muted"]:
        value = str(theme[key])
        if not value.startswith("#") or len(value) not in [4, 7]:
            raise ValueError(f"{key} must be a hex color.")
        theme[key] = value
    if theme["displayFont"] not in allowed_fonts:
        raise ValueError("Display font is not supported.")
    if theme["bodyFont"] not in allowed_fonts:
        raise ValueError("Body font is not supported.")
    theme["preset"] = str(theme.get("preset") or "custom")[:30]
    return theme


def update_theme(workspace_slug, data):
    theme = clean_theme(data)
    workspace = get_workspace(workspace_slug)
    workspace["theme"] = theme
    workspace["updatedAtUtc"] = datetime.utcnow().isoformat() + "Z"
    table.put_item(Item=workspace)
    return theme


def handle_public(method, path, query, body):
    parts = path.strip("/").split("/")
    if len(parts) < 4:
        return response(404, {"error": "Not found"})
    workspace_slug, appointment_slug = parts[3], parts[4] if len(parts) > 4 else ""
    workspace = get_workspace(workspace_slug)
    appt = get_appointment(workspace_slug, appointment_slug)

    if len(parts) == 5 and method == "GET":
        if query.get("email"):
            contact = get_contact_by_email(workspace_slug, query["email"])
            if contact:
                add_contact_activity(workspace_slug, contact["id"], "PageVisited", "Booking page visited", appt["name"], {"appointmentSlug": appointment_slug})
        return response(200, {"workspaceName": workspace.get("name", "Workspace"), "appointmentTypeName": appt["name"], "description": appt.get("description"), "durationMinutes": appt["durationMinutes"], "locationType": appt.get("locationType"), "locationValue": appt.get("locationValue"), "timezone": appt.get("timezone", TZ), "serviceIntervalMinutes": int(appt.get("serviceIntervalMinutes", 15)), "theme": get_theme(workspace_slug)})
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
    bookings = list_bookings(appt["pk"].replace("WS#", "", 1))
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
                hidden_by_look_busy = should_hide_slot(appt, slot_start)
                if min_bookable <= slot_start <= max_bookable and not hidden_by_look_busy and not conflicts(bookings, blocked_start, blocked_end):
                    display = slot_start.astimezone(ZoneInfo(display_tz)).isoformat()
                    slots.append({"startUtc": slot_start.isoformat().replace("+00:00", "Z"), "endUtc": slot_end.isoformat().replace("+00:00", "Z"), "displayStart": display})
                cursor += timedelta(minutes=int(appt.get("serviceIntervalMinutes", 15)))
        day += timedelta(days=1)
    return slots


def should_hide_slot(appt, slot_start):
    percentage = int(appt.get("lookBusyPercentage", 0) or 0)
    if percentage <= 0:
        return False
    if percentage >= 100:
        return True
    key = f"{appt.get('id')}:{slot_start.isoformat()}".encode("utf-8")
    value = int(hashlib.sha256(key).hexdigest()[:8], 16) % 100
    return value < percentage


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
    customer = validate_booking_customer(data)
    start = datetime.fromisoformat(data["startUtc"].replace("Z", "+00:00"))
    valid = any(slot["startUtc"] == data["startUtc"].replace("+00:00", "Z") for slot in generate_slots(appt, start.date().isoformat(), start.date().isoformat(), data.get("timezone", TZ)))
    if not valid:
        raise ConflictError("The selected slot is no longer available.")

    end = start + timedelta(minutes=int(appt["durationMinutes"]))
    blocked_start = start - timedelta(minutes=int(appt.get("bufferBeforeMinutes", 0)))
    blocked_end = end + timedelta(minutes=int(appt.get("bufferAfterMinutes", 0)))
    if conflicts(list_bookings(appt["pk"].replace("WS#", "", 1)), blocked_start, blocked_end):
        raise ConflictError("The selected slot has just been booked.")

    booking_id = str(uuid.uuid4())
    workspace_slug = appt["pk"].replace("WS#", "", 1)
    email = customer["email"].strip().lower()
    now = datetime.utcnow().isoformat() + "Z"
    contact = upsert_booking_contact(workspace_slug, customer, data.get("timezone", TZ))
    table.put_item(Item={"pk": appt["pk"], "sk": f"BOOKING#{booking_id}", "entity": "booking", "id": booking_id, "appointmentTypeId": appt["id"], "userId": appt["assignedUserId"], "status": "Confirmed", "startUtc": start.isoformat().replace("+00:00", "Z"), "endUtc": end.isoformat().replace("+00:00", "Z"), "blockedStartUtc": blocked_start.isoformat().replace("+00:00", "Z"), "blockedEndUtc": blocked_end.isoformat().replace("+00:00", "Z"), "customerName": f"{customer['firstName']} {customer['lastName']}".strip(), "customerEmail": customer["email"], "customerPhone": customer["phone"], "notes": data.get("notes"), "createdAtUtc": now})
    add_contact_activity(workspace_slug, contact["id"], "AppointmentBooked", "Appointment booked", appt["name"], {"bookingId": booking_id, "startUtc": start.isoformat().replace("+00:00", "Z")})
    return {"bookingId": booking_id, "status": "Confirmed", "startUtc": start.isoformat().replace("+00:00", "Z"), "endUtc": end.isoformat().replace("+00:00", "Z")}


def validate_booking_customer(data):
    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    if len(first_name) < 2:
        raise ValueError("First name must be at least 2 characters.")
    if len(last_name) < 2:
        raise ValueError("Last name must be at least 2 characters.")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email):
        raise ValueError("Enter a valid email address.")
    if not re.match(r"^\+?[0-9\s().-]{7,20}$", phone):
        raise ValueError("Enter a valid phone number.")
    return {"firstName": first_name[:80], "lastName": last_name[:80], "email": email[:254], "phone": phone[:30]}


def list_bookings(workspace_slug=WORKSPACE_SLUG):
    result = table.query(KeyConditionExpression=Key("pk").eq(workspace_pk(workspace_slug)) & Key("sk").begins_with("BOOKING#"))
    return [{k: item.get(k) for k in ["id", "appointmentTypeId", "userId", "status", "startUtc", "endUtc", "blockedStartUtc", "blockedEndUtc", "customerName", "customerEmail", "customerPhone", "notes"]} for item in result.get("Items", [])]


def parse_time(value):
    hour, minute = value.split(":")[:2]
    return time(int(hour), int(minute))
