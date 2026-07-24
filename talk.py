def apply_discounts(orders, user):
    total = 0
    for order in orders:
        if order.status == "paid":
            for item in order.items:
                if item.category == "promo":
                    if user.is_premium:
                        total += item.price * 0.8
                    else:
                        total += item.price * 0.9
                elif item.price > 100:
                    total += item.price * 0.95
        elif order.status == "pending":
            total += order.total
    return total


def parse_config(path):
    config = {}
    if not path.exists():
        return config
    for line in path.read_text().splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            config[key] = value
    return config


def get_words(count):
    match count:
        case 1:
            return "one"
        case 2:
            return "a couple"
        case 3:
            return "a few"
        case 4:
            return "several"
        case _:
            return "lots"


def sum_of_primes(max):
    total = 0
    for i in range(1, max + 1):
        is_prime = True
        for j in range(2, i):
            if i % j == 0:
                is_prime = False
                break
        if is_prime:
            total += i
    return total


def process_linear(items):
    for i in items:
        check(i)
    for j in items:
        if j.valid:
            use(j)
    if items:
        init()


def process_nested(items):
    for i in items:
        for j in items:
            if j.valid:
                if j.active:
                    use(j)
    if items:
        init()


def ready_one_sequence(a, b, c, d):
    return a and b and c and d


def ready_three_sequences(a, b, c, d):
    return a and b or c and d


def log_calls(func):
    def wrapper(*args):
        if args:
            print("called with args")
        return func(*args)
    return wrapper


def get_discount_before(user, cart):
    if user is not None:
        if user.is_active:
            if cart.total > 100:
                if user.is_premium:
                    return 0.2
                else:
                    return 0.1
    return 0.0


def get_discount_after(user, cart):
    if user is None or not user.is_active:
        return 0.0
    if cart.total <= 100:
        return 0.0
    return 0.2 if user.is_premium else 0.1


def active_premium_emails_before(users):
    result = []
    for u in users:
        if u.is_active:
            if u.is_premium:
                if u.email:
                    result.append(u.email.lower())
    return result


def active_premium_emails_after(users):
    return [
        u.email.lower()
        for u in users
        if u.is_active and u.is_premium and u.email
    ]


def has_expired_item_before(items):
    found = False
    for item in items:
        if item.status == "active":
            if item.days_left < 0:
                found = True
                break
    return found


def has_expired_item_after(items):
    return any(
        item.days_left < 0
        for item in items
        if item.status == "active"
    )


# ---------------------------------------------------------------------------
# Intermediate states for the step-by-step refactor slides (Act 4).
# Each function is one click in the auto-animate chain; the deck shows the
# cognitive-complexity score at every step, so every state is scored here.
# ---------------------------------------------------------------------------


# Refactor 1: nested conditionals -> guard clauses, peeled one guard at a time.
def get_discount_step1(user, cart):
    if user is None:
        return 0.0
    if user.is_active:
        if cart.total > 100:
            if user.is_premium:
                return 0.2
            else:
                return 0.1
    return 0.0


def get_discount_step2(user, cart):
    if user is None:
        return 0.0
    if not user.is_active:
        return 0.0
    if cart.total > 100:
        if user.is_premium:
            return 0.2
        else:
            return 0.1
    return 0.0


def get_discount_step3(user, cart):
    if user is None:
        return 0.0
    if not user.is_active:
        return 0.0
    if cart.total <= 100:
        return 0.0
    if user.is_premium:
        return 0.2
    else:
        return 0.1


def get_discount_step4(user, cart):
    if user is None:
        return 0.0
    if not user.is_active:
        return 0.0
    if cart.total <= 100:
        return 0.0
    return 0.2 if user.is_premium else 0.1


# Refactor 2: nested accumulation -> comprehension, via a flattened and-chain.
def active_premium_emails_step1(users):
    result = []
    for u in users:
        if u.is_active and u.is_premium and u.email:
            result.append(u.email.lower())
    return result


# Refactor 3: flag + break -> any(), via a flattened and-chain.
def has_expired_item_step1(items):
    found = False
    for item in items:
        if item.status == "active" and item.days_left < 0:
            found = True
            break
    return found


# Refactor 4: nested if/elif dispatch -> match with structural patterns.
def run_command_before(command):
    parts = command.split()
    if parts[0] == "move":
        if len(parts) == 3:
            return f"move to {parts[1]},{parts[2]}"
    elif parts[0] == "rotate":
        if len(parts) == 2:
            return f"rotate {parts[1]}"
    elif parts[0] == "quit":
        return "bye"
    return "?"


def run_command_after(command):
    match command.split():
        case ["move", x, y]:
            return f"move to {x},{y}"
        case ["rotate", angle]:
            return f"rotate {angle}"
        case ["quit"]:
            return "bye"
        case _:
            return "?"
