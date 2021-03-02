import click
import boto3
from botocore.exceptions import ClientError
import json
import time
from tqdm import tqdm
from tqdm import trange

@click.command()
@click.option('--command', type=click.STRING, required=True, help='command name')
@click.option('--src', type=click.STRING, required=False, help='source table name')
@click.option('--dest', type=click.STRING, required=False, help='destination table name')
def main(command, src, dest):
    print(command + ' ' + src + ' ' + dest)


def exportData():
    start = time.time()
    pbar = tqdm(total=100)
    client = boto3.client('dynamodb', region_name='ap-northeast-2')
    startKey = None
    rs = []
    m = 0
    while(True):
        if startKey == None:
            response = client.scan(
                TableName='test01-music'
            );
        else :
            response = client.scan(
                TableName='test01-music',
                ExclusiveStartKey= startKey
            );
        for item in response['Items']:
            rs.append(getObject(item))
            if len(rs) % 10000 == 0:
                pbar.update(1)
            if(len(rs) == 100000):
                with open('./export{0}.json'.format(m), 'w', encoding='utf-8') as file:
                    json.dump(rs, file, ensure_ascii=False)
                file.close()
                rs = []
                m += 1
        if response.get('LastEvaluatedKey'):
            startKey = response['LastEvaluatedKey']
        else:
            pbar.close()
            print('consumed time : ' + str(time.time() - start))
            break
        
def importData(num):
    start = time.time()
    #pbar = tqdm(total=100)
    with open('./export{0}.json'.format(num), 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    client = boto3.client('dynamodb', region_name='ap-northeast-2')
    total = len(json_data)
    cur = 0
    while(total > 0): 
        RequestItems={
            'test01-music2': []
        }
        for i in range(0, 25 if total > 25 else total):
            RequestItems['test01-music2'].append({'PutRequest': {'Item': getMap(json_data[cur])}})
            cur += 1
        total -= 25 if total >= 25 else 0

        response = client.batch_write_item(RequestItems)

        while(response.get('UnprocessedItems') != None):
            RequestItems['PutRequest'] = response['UnprocessedItems']
            client.batch_write_item(RequestItems)
        print('batch success => ' + str(cur))
    print('consumed time : ' + str(time.time() - start))
    
    
    
def getObject(obj):
    result = {}
    for key in obj:
        if obj[key].get('S'):
            result[key] = obj[key]['S']
        elif obj[key].get('N'):
            result[key] = int(obj[key]['N'])
        elif obj[key].get('BOOL'):
            result[key] = obj[key]['BOOL']
        elif obj[key].get('M'):
            result[key] = getObject(obj[key]['M'])
    return result

def getMap(obj):
    result = {}
    for key in obj:
        if type(obj[key]) == type(''):
            result[key] = {'S': obj[key]}
        elif type(obj[key]) == type(1):
            result[key] = {'N': obj[key]}
        elif type(obj[key]) == type(True):
            result[key] = {'BOOL': obj[key]}
        elif type(obj[key]) == type({}):
            result[key] = {'M': getMap(obj[key])}
    return result

if __name__ == '__main__':
    #exportData()
    #for i in range(0, 10):
    importData(0)
