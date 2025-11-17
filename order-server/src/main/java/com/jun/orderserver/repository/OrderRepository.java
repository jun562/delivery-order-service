package com.jun.orderserver.repository;

import com.jun.orderserver.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, String> {

}
