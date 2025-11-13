package com.jun.orderserver.grpc;

import com.jun.grpc.simple.GreetRequest;
import com.jun.grpc.simple.GreetResponse;
import com.jun.grpc.simple.SimpleServiceGrpc.SimpleServiceImplBase;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class SimpleGrpcService extends SimpleServiceImplBase {

    /*
    Greet 함수 구현
     */
    @Override
    public void greet(GreetRequest request, StreamObserver<GreetResponse> responseObserver) {
        String name = request.getName();
        System.out.println("[order-server] gRPC 요청 받음: " + name);

        String message = "Hello, " + name + "! (From order-server)";
        GreetResponse response = GreetResponse.newBuilder().setMessage(message).build();

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

}
