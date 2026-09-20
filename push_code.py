import subprocess
import sys

def push_branch(branch_name):
    try:
        result = subprocess.run(['git', 'push', 'origin', branch_name], capture_output=True, text=True, check=True)
        print(f"Success: {result.stdout}")
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    push_branch("jules-5078094046571600674-5bc9d5c6")
