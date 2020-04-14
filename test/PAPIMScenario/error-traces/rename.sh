#!/bin/bash
for file in *.json
do
  for agent in 201 202 203 204 205 206
  do
    newfile="EP_Agent_$agent-$file"
    cp $file $newfile
    sed -i '' "s/EP_Agent_201/EP_Agent_$agent/g" $newfile
    case $agent in
      201|202|203)
        sed -i '' "s/api-gateway.example.com/blue-cluster.gg.broadcom.com/g" $newfile
        ;;
      204|205|206)
        sed -i '' "s/api-gateway.example.com/green-cluster.gg.broadcom.com/g" $newfile
        ;;
      *) ;;
    esac
    sed -i '' "s/api-gateway/atviegw0${agent}.gg.broadcom.com/g" $newfile
    sed -i '' "s/172.22.0.4/172.22.0.${agent}/g" $newfile
  done
done
