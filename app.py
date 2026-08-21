import os
import sys
import subprocess

if __name__ == '__main__':
    # Determine the directory where this script is located
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, 'backend')
    
    # Switch the working directory to backend so config file paths and env files load correctly
    os.chdir(backend_dir)
    
    # Execute the actual backend app.py in a subprocess and forward any arguments
    try:
        result = subprocess.run([sys.executable, 'app.py'] + sys.argv[1:])
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        # Graceful exit on Ctrl+C
        sys.exit(0)
