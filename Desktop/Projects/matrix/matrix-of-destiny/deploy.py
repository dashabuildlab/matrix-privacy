import paramiko, os, sys

KEY_PATH = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\deploy_key'
DIST_PATH = r'C:\Users\dell\Desktop\Projects\matrix\matrix-of-soul\dist'
HOST = '89.167.40.15'
USER = 'deployer'
REMOTE_PATH = '/srv/apps/matrix-of-soul'

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, pkey=key)

sftp = client.open_sftp()

def upload_dir(local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except:
        pass
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item
        if os.path.isdir(local_path):
            upload_dir(local_path, remote_path)
        else:
            print(f'Uploading {remote_path}')
            sftp.put(local_path, remote_path)

upload_dir(DIST_PATH, REMOTE_PATH)
sftp.close()
client.close()
print('DONE - Deploy complete!')
