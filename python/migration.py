import boto3
from botocore.exceptions import ClientError
import json
import time
from tqdm import tqdm
from tqdm import trange
import threading
import convert as cv
import click
import threading
import time
import sys

def exportData(num):
    pbar = tqdm(total=100)
    start = time.time()
    client = boto3.client('dynamodb', region_name='ap-northeast-2')
    startKey = None
    rs = []
    while(len(rs) < 100000):
        if startKey == None:
            response = client.scan(
                TableName='test01-music',
                FilterExpression = "dummy between :v_start and :v_end",
                ExpressionAttributeValues = {
                    ':v_start' : {'N' : str(500 * num)},
                    ':v_end' : {'N' : str(500 * (num + 1) - 1)}
                }
            );
        else :
            response = client.scan(
                TableName='test01-music',
                ExclusiveStartKey= startKey,
                FilterExpression = "dummy between :v_start and :v_end",
                ExpressionAttributeValues = {
                    ':v_start' : {'N' : str(500 * num)},
                    ':v_end' : {'N' : str(500 * (num + 1) - 1)}
                }
            );
        for item in response['Items']:
            rs.append(getObject(item))
            if len(rs) % 1000 == 0:
                pbar.update(1)
            if len(rs) == 100000 :
                with open('./exportData/export{0}.json'.format(num), 'w', encoding='utf-8') as file:
                    json.dump(rs, file, ensure_ascii=False)
                file.close()
        if response.get('LastEvaluatedKey'):
            startKey = response['LastEvaluatedKey']
    pbar.close()
        
def importData(num):
    start = time.time()
    pbar = tqdm(total=100)
    with open('./exportData/export{0}.json'.format(num), 'r', encoding='utf-8') as file:
        json_data = json.load(file)
    dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
    client = dynamodb.Table('test01-music2')
    total = len(json_data)
    dum = 0
    cur = 0
    while(total > 0): 
        with client.batch_writer() as batch:
            for i in range(25):
                json_data[cur]['dummy'] = dum
                batch.put_item(Item=json_data[cur])
                dum = 0 if dum == 5000 else dum + 1
                cur += 1
            total = total - 25 if total >= 25 else 0
        if total % 1000 == 0:
            pbar.update(1)
    

def convert(option):
    for num in range(0, 10):
        pbar = tqdm(total=100)
        with open('./exportData/export{0}.json'.format(num), 'r', encoding='utf-8') as file:
            json_data = json.load(file)
        file.close()
        result = []
        cnt = 0
        for item in json_data:
            if option == 'add':
                result.append(cv.add(item))
            elif option == 'edit':
                result.append(cv.edit(item))
            elif option == 'delete':
                result.append(cv.delete(item))
            cnt += 1
            if cnt % 1000 == 0:
                pbar.update(1)
        with open('./exportData/export{0}.json'.format(num), 'w', encoding='utf-8') as file:
            json.dump(result, file, ensure_ascii=False)
        file.close()
    
    
def getObject(obj):
    result = {}
    for key in obj:
        if key != 'dummy':
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
            result[key] = {'N': str(obj[key])}
        elif type(obj[key]) == type(True):
            result[key] = {'BOOL': obj[key]}
        elif type(obj[key]) == type({}):
            result[key] = {'M': getMap(obj[key])}
    return result


if __name__ == '__main__':
    command = sys.argv[1]
    if len(sys.argv) == 3:
        option = sys.argv[2]
    if command == 'import':
        t = []
        for k in range(0, 5):
            for i in range(2 * k, 2 * (k + 1)):
                t.append(threading.Thread(target = importData, args = (i,)))
                t[i].start()
            t[2 * k + 1].join()
    elif command == 'export':
        for i in range(0, 10):
            threading.Thread(target = exportData, args = (i,)).start()
    elif command == 'convert':
        convert(option)
