import argparse
import getpass
from auth import create_user, delete_user, list_users, set_role, set_active


def cmd_create(args):
    password = args.password or getpass.getpass("Password: ")
    if len(password) < 6:
        print("Password must be at least 6 characters.")
        return
    create_user(args.email, args.name, password, args.role)
    print(f"Created {args.role}: {args.email}")


def cmd_list(args):
    users = list_users()
    if not users:
        print("No users found.")
        return
    for user in users:
        status = "active" if user["is_active"] else "disabled"
        last_login = user["last_login_at"] or "never"
        print(f"{user['id']:>4}  {user['email']:<30} {user['name']:<24} {user['role']:<8} {status:<9} last login: {last_login}")


def cmd_delete(args):
    count = delete_user(args.email)
    if count:
        print(f"Deleted {args.email}")
    else:
        print(f"No user found with email {args.email}")


def cmd_set_role(args):
    count = set_role(args.email, args.role)
    if count:
        print(f"Set {args.email} role to {args.role}")
    else:
        print(f"No user found with email {args.email}")


def cmd_set_active(args):
    count = set_active(args.email, args.active)
    if count:
        print(f"Set {args.email} active={args.active}")
    else:
        print(f"No user found with email {args.email}")


def main():
    parser = argparse.ArgumentParser(description="Manage BlitzCast user accounts")
    sub = parser.add_subparsers(dest="command", required=True)

    p_create = sub.add_parser("create", help="Create a new user")
    p_create.add_argument("--email", required=True)
    p_create.add_argument("--name", required=True)
    p_create.add_argument("--role", choices=["admin", "analyst"], default="analyst")
    p_create.add_argument("--password", help="Omit to be prompted securely")
    p_create.set_defaults(func=cmd_create)

    p_list = sub.add_parser("list", help="List all users")
    p_list.set_defaults(func=cmd_list)

    p_delete = sub.add_parser("delete", help="Delete a user by email")
    p_delete.add_argument("--email", required=True)
    p_delete.set_defaults(func=cmd_delete)

    p_role = sub.add_parser("set-role", help="Change a user's role")
    p_role.add_argument("--email", required=True)
    p_role.add_argument("--role", choices=["admin", "analyst"], required=True)
    p_role.set_defaults(func=cmd_set_role)

    p_active = sub.add_parser("set-active", help="Enable or disable a user without deleting them")
    p_active.add_argument("--email", required=True)
    p_active.add_argument("--active", type=lambda v: v.lower() in ("1", "true", "yes"), required=True)
    p_active.set_defaults(func=cmd_set_active)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()