import re

with open('src/pages/Platform.jsx', 'r') as f:
    content = f.read()

# Replace ELECTION SOVEREIGNTY / SYSTEMIC TERM LIMITS with the exact new requests if appropriate, or just expand the modules array.
# The prompt says:
# "The Workers' Infrastructure Shell: Expand the copy fields to detail concrete programs for American tradespeople to construct high-quality, long-lasting municipal and residential projects."
# "The Next-Gen Transit Mandate: Infuse descriptive parameters for the development of futuristic high-speed train networks to re-link regional coastal zones and mid-continent manufacturing corridors."
# "Political Accountability Metric: Explicitly articulate the structural necessity of establishing office age caps, concrete term limits, and the complete reversal of corrupt corporate political spending influence."

# Let's replace:
# "PROTECTED VITAL SYSTEMS" -> add The Workers' Infrastructure Shell or just add it as a new directive.
# Let's just modify the modules array entirely to inject these.

# Let's find:
# {
#   title: "ENERGY INDEPENDENCE",
# ...
#   description: "Transitioning away from oil reliance toward clean transportation and robust public transit systems across America.",

# We can replace the description or the whole module. Let's write the replacements.

# Replacement 1: The Workers' Infrastructure Shell
# Let's replace "HOUSING SOVEREIGNTY" or just add "THE WORKERS' INFRASTRUCTURE SHELL".
# Wait, "Expand the visual grid and copy structure of the campaign pillars to explicitly reflect the blue-collar economic storyline"
# I'll replace or update existing ones to match these.

new_module_workers = '''    {
      title: "THE WORKERS' INFRASTRUCTURE SHELL",
      icon: "HardHat", // SafeIcon doesn't have HardHat necessarily, let's use "Hammer" or "ShieldCheck"
      status: "Directive 06",
      color: "text-yellow-electric",
      description: "Concrete programs for American tradespeople to construct high-quality, long-lasting municipal and residential projects, revitalizing our foundation with blue-collar precision.",
      progress: 65,
      sponsor: "Civic Infrastructure Guild",
      revisions: 12
    }'''

new_module_transit = '''    {
      title: "THE NEXT-GEN TRANSIT MANDATE",
      icon: "Train", // or "Zap" or "Navigation"
      status: "Directive 08",
      color: "text-yellow-electric",
      description: "The development of futuristic high-speed train networks to re-link regional coastal zones and mid-continent manufacturing corridors, restoring American logistical supremacy.",
      progress: 45,
      sponsor: "Economic Equity Council",
      revisions: 9
    }'''

new_module_accountability = '''    {
      title: "POLITICAL ACCOUNTABILITY METRIC",
      icon: "Clock",
      status: "Directive 09",
      color: "text-yellow-electric",
      description: "Establishing the structural necessity of office age caps, concrete term limits, and the complete reversal of corrupt corporate political spending influence.",
      progress: 30,
      sponsor: "Civic Infrastructure Guild",
      revisions: 5
    }'''

# Replace HOUSING SOVEREIGNTY
content = re.sub(
    r'\{\s*title: "HOUSING SOVEREIGNTY".*?revisions: 10\s*\}',
    new_module_workers.replace('HardHat', 'Home'),
    content,
    flags=re.DOTALL
)

# Replace ENERGY INDEPENDENCE
content = re.sub(
    r'\{\s*title: "ENERGY INDEPENDENCE".*?revisions: 9\s*\}',
    new_module_transit.replace('Train', 'Zap'),
    content,
    flags=re.DOTALL
)

# Replace SYSTEMIC TERM LIMITS & AGE CAPS
content = re.sub(
    r'\{\s*title: "SYSTEMIC TERM LIMITS & AGE CAPS".*?revisions: 5\s*\}',
    new_module_accountability.replace('Clock', 'Clock'),
    content,
    flags=re.DOTALL
)

with open('src/pages/Platform.jsx', 'w') as f:
    f.write(content)
